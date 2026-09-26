import https from 'https';
import crypto from 'crypto';
import type { Pool } from 'pg';

// Integração real com a API Pix do Sicoob (padrão BACEN, autenticação
// OAuth 2.0 client_credentials + mTLS). Diferente do scaffold anterior
// (que só conferia se Client ID/Secret não estavam vazios e montava um
// "Copia e Cola" na mão com CRC16 inválido), este módulo faz chamadas
// HTTP reais — inclusive apresentando o certificado cliente no próprio
// handshake TLS, exigido pelo Sicoob tanto no OAuth quanto na API Pix.

export interface SicoobConfig {
  env: 'sandbox' | 'production';
  clientId: string;
  clientSecret: string;
  pixKey: string;
  certPem: string;
  keyPem: string;
  keyPassphrase: string;
  accountNumber: string;
}

export async function getSicoobConfig(pool: Pool): Promise<SicoobConfig> {
  const r = await pool.query(
    `SELECT key, value FROM settings WHERE key IN (
      'sicoob_env', 'sicoob_client_id', 'sicoob_client_secret', 'sicoob_pix_key',
      'sicoob_cert_pem', 'sicoob_key_pem', 'sicoob_key_passphrase', 'sicoob_account_number'
    )`
  );
  const map: Record<string, string> = {};
  r.rows.forEach(row => { map[row.key] = row.value; });
  return {
    env: (map.sicoob_env as 'sandbox' | 'production') || 'sandbox',
    clientId: map.sicoob_client_id || '',
    clientSecret: map.sicoob_client_secret || '',
    pixKey: map.sicoob_pix_key || '',
    certPem: map.sicoob_cert_pem || '',
    keyPem: map.sicoob_key_pem || '',
    keyPassphrase: map.sicoob_key_passphrase || '',
    accountNumber: map.sicoob_account_number || '',
  };
}

function authBaseUrl(env: string) {
  return env === 'production'
    ? 'https://auth.sicoob.com.br'
    : 'https://auth-sandbox.sicoob.com.br';
}

function pixBaseUrl(env: string) {
  return env === 'production'
    ? 'https://api.sicoob.com.br/pix/api/v2'
    : 'https://sandbox.sicoob.com.br/sicoob/sandbox/pix/api/v2';
}

// Node's global fetch (undici) não aceita cert/key mTLS na forma clássica
// de um https.Agent — usamos o módulo https nativo diretamente, mesmo
// padrão (CURLOPT_SSLCERT/CURLOPT_SSLKEY) das integrações de referência
// consultadas para este projeto.
function mtlsRequest(config: SicoobConfig, opts: {
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    if (!config.certPem || !config.keyPem) {
      reject(new Error('Certificado mTLS (.pem) e chave privada (.pem) do Sicoob não configurados.'));
      return;
    }
    const u = new URL(opts.url);
    const req = https.request({
      hostname: u.hostname,
      path: `${u.pathname}${u.search}`,
      method: opts.method,
      headers: opts.headers,
      cert: config.certPem,
      key: config.keyPem,
      passphrase: config.keyPassphrase || undefined,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json: any = null;
        try { json = data ? JSON.parse(data) : null; } catch { json = { raw: data }; }
        resolve({ status: res.statusCode || 0, json });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// Cache em memória do access token (evita gerar um novo a cada chamada —
// o Sicoob, como qualquer OAuth client_credentials, espera reuso até expirar).
let cachedToken: { env: string; clientId: string; accessToken: string; expiresAt: number } | null = null;

export async function getSicoobAccessToken(config: SicoobConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.env === config.env && cachedToken.clientId === config.clientId && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }

  if (!config.clientId) {
    throw new Error('Client ID do Sicoob não configurado.');
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    scope: 'cob.write cob.read pix.read pix.write webhook.read webhook.write',
  });
  if (config.clientSecret) params.set('client_secret', config.clientSecret);

  const body = params.toString();
  const { status, json } = await mtlsRequest(config, {
    method: 'POST',
    url: `${authBaseUrl(config.env)}/auth/realms/cooperado/protocol/openid-connect/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body,
  });

  if (status < 200 || status >= 300 || !json?.access_token) {
    throw new Error(json?.error_description || json?.error || `Falha ao autenticar no Sicoob (HTTP ${status}).`);
  }

  cachedToken = {
    env: config.env,
    clientId: config.clientId,
    accessToken: json.access_token,
    // margem de 60s antes da expiração real informada
    expiresAt: now + (Number(json.expires_in || 3600) - 60) * 1000,
  };
  return json.access_token;
}

export interface CreateCobParams {
  txid: string;
  valor: number;
  devedorNome: string;
  devedorCpf?: string;
  solicitacaoPagador: string;
  expiracaoSegundos?: number;
}

export interface CobResult {
  txid: string;
  status: string;
  pixCopiaECola?: string;
}

export async function createOrUpdateCob(config: SicoobConfig, params: CreateCobParams): Promise<CobResult> {
  const accessToken = await getSicoobAccessToken(config);
  if (!config.pixKey) {
    throw new Error('Chave PIX do Sicoob não configurada.');
  }

  const devedor: Record<string, string> = { nome: params.devedorNome };
  const cpfDigits = (params.devedorCpf || '').replace(/\D/g, '');
  if (cpfDigits.length === 11) devedor.cpf = cpfDigits;

  const bodyObj = {
    calendario: { expiracao: params.expiracaoSegundos ?? 3600 },
    devedor,
    valor: { original: params.valor.toFixed(2) },
    chave: config.pixKey,
    solicitacaoPagador: params.solicitacaoPagador,
  };
  const body = JSON.stringify(bodyObj);

  const { status, json } = await mtlsRequest(config, {
    method: 'PUT',
    url: `${pixBaseUrl(config.env)}/cob/${params.txid}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'client_id': config.clientId,
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body,
  });

  if (status < 200 || status >= 300) {
    const detail = json?.detail || json?.message || json?.mensagem || JSON.stringify(json);
    throw new Error(`Erro ao criar cobrança PIX no Sicoob (HTTP ${status}): ${detail}`);
  }

  return { txid: json.txid || params.txid, status: json.status, pixCopiaECola: json.pixCopiaECola };
}

export async function fetchCob(config: SicoobConfig, txid: string): Promise<CobResult> {
  const accessToken = await getSicoobAccessToken(config);
  const { status, json } = await mtlsRequest(config, {
    method: 'GET',
    url: `${pixBaseUrl(config.env)}/cob/${txid}`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'client_id': config.clientId,
    },
  });
  if (status < 200 || status >= 300) {
    const detail = json?.detail || json?.message || json?.mensagem || JSON.stringify(json);
    throw new Error(`Erro ao consultar cobrança PIX no Sicoob (HTTP ${status}): ${detail}`);
  }
  return { txid: json.txid || txid, status: json.status, pixCopiaECola: json.pixCopiaECola };
}

export async function registerWebhook(config: SicoobConfig, webhookUrl: string): Promise<void> {
  const accessToken = await getSicoobAccessToken(config);
  if (!config.pixKey) {
    throw new Error('Chave PIX do Sicoob não configurada.');
  }
  const body = JSON.stringify({ webhookUrl });
  const { status, json } = await mtlsRequest(config, {
    method: 'PUT',
    url: `${pixBaseUrl(config.env)}/webhook/${config.pixKey}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'client_id': config.clientId,
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body,
  });
  if (status < 200 || status >= 300) {
    const detail = json?.detail || json?.message || json?.mensagem || JSON.stringify(json);
    throw new Error(`Erro ao registrar webhook no Sicoob (HTTP ${status}): ${detail}`);
  }
}

export async function fetchAccountInfo(config: SicoobConfig): Promise<{ accessToken: string; expiresIn: number; scope: string }> {
  const accessToken = await getSicoobAccessToken(config);
  return { accessToken, expiresIn: 3600, scope: 'cob.read cob.write pix.read pix.write webhook.read webhook.write' };
}

// Gera um txid compatível com o padrão BACEN: 26-35 caracteres
// alfanuméricos (sem '_' nem '-', diferente dos tx_id usados até agora
// no sistema para outros gateways).
export function generateSicoobTxId(): string {
  return crypto.randomBytes(20).toString('hex').slice(0, 32);
}
