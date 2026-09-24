import crypto from 'crypto';
import type { Pool } from 'pg';

// Integração real com a API do Mercado Pago (Checkout Pro). Diferente da
// integração Sicoob existente no projeto (que simula token/cobrança sem
// nunca chamar a API real), tudo aqui faz chamadas HTTP de verdade —
// é a primeira integração de pagamento do sistema que efetivamente cobra.

const MP_API_BASE = 'https://api.mercadopago.com';

export interface MercadoPagoConfig {
  accessToken: string;
  publicKey: string;
  webhookSecret: string;
}

export async function getMercadoPagoConfig(pool: Pool): Promise<MercadoPagoConfig> {
  const r = await pool.query(
    "SELECT key, value FROM settings WHERE key IN ('mercadopago_access_token', 'mercadopago_public_key', 'mercadopago_webhook_secret')"
  );
  const map: Record<string, string> = {};
  r.rows.forEach(row => { map[row.key] = row.value; });
  return {
    accessToken: map.mercadopago_access_token || '',
    publicKey: map.mercadopago_public_key || '',
    webhookSecret: map.mercadopago_webhook_secret || '',
  };
}

// O Mercado Pago não tem um toggle sandbox/produção separado — o próprio
// Access Token indica o modo pelo prefixo (TEST- para contas/credenciais de
// teste, APP_USR- para produção).
export function mercadoPagoEnvFromToken(accessToken: string): 'test' | 'production' | 'unknown' {
  if (accessToken.startsWith('TEST-')) return 'test';
  if (accessToken.startsWith('APP_USR-')) return 'production';
  return 'unknown';
}

export function maskAccessToken(accessToken: string): string {
  if (!accessToken) return '';
  if (accessToken.length <= 8) return '••••••••';
  return `${accessToken.slice(0, accessToken.indexOf('-') + 1)}••••${accessToken.slice(-4)}`;
}

interface PreferenceItem {
  title: string;
  quantity: number;
  unitPrice: number;
}

interface CreatePreferenceParams {
  accessToken: string;
  items: PreferenceItem[];
  externalReference: string;
  payerEmail?: string;
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl: string;
}

export async function createPreference(params: CreatePreferenceParams): Promise<{ id: string; initPoint: string }> {
  const { accessToken, items, externalReference, payerEmail, backUrls, notificationUrl } = params;

  const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: items.map(it => ({
        title: it.title,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        currency_id: 'BRL',
      })),
      external_reference: externalReference,
      payer: payerEmail ? { email: payerEmail } : undefined,
      back_urls: {
        success: backUrls.success,
        failure: backUrls.failure,
        pending: backUrls.pending,
      },
      auto_return: 'approved',
      notification_url: notificationUrl,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Erro ao criar preferência no Mercado Pago (HTTP ${res.status}).`);
  }

  const initPoint = mercadoPagoEnvFromToken(accessToken) === 'production' ? data.init_point : (data.sandbox_init_point || data.init_point);
  return { id: data.id, initPoint };
}

export async function fetchPayment(accessToken: string, paymentId: string): Promise<any> {
  const res = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Erro ao consultar pagamento no Mercado Pago (HTTP ${res.status}).`);
  }
  return data;
}

export async function fetchAccountInfo(accessToken: string): Promise<any> {
  const res = await fetch(`${MP_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Credenciais inválidas ou expiradas (HTTP ${res.status}).`);
  }
  return data;
}

// Verificação da assinatura do webhook, conforme documentado pelo Mercado
// Pago: header x-signature ("ts=...,v1=...") é um HMAC-SHA256 de um manifest
// "id:{dataId};request-id:{xRequestId};ts:{ts};" usando o Webhook Secret
// configurado. Sem isso, qualquer POST não autenticado poderia forjar a
// confirmação de um pagamento — é a diferença real de segurança em relação
// ao webhook do Sicoob (que aceita qualquer corpo sem validar remetente).
export function verifyWebhookSignature(opts: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  webhookSecret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, webhookSecret } = opts;
  if (!xSignature || !dataId || !webhookSecret) return false;

  const parts: Record<string, string> = {};
  xSignature.split(',').forEach(part => {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  });
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId || ''};ts:${ts};`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}
