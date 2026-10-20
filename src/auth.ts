import crypto from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export interface TokenPayload {
  userId: string;
  role: string;
  clubId?: string;
  iat: number;
  exp: number;
}

let cachedSecret = process.env.AUTH_SECRET || '';

export function setAuthSecret(secret: string) {
  cachedSecret = secret;
}

export function getAuthSecret(): string {
  if (!cachedSecret) {
    cachedSecret = process.env.AUTH_SECRET || 'gg_competicoes_default_fallback_secret_key_2026_secure';
  }
  return cachedSecret;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Emite token assinado com HMAC-SHA256 e validade configurável (padrão 30 dias).
 */
export function signToken(payload: { userId: string; role: string; clubId?: string }, expiresInSeconds = 30 * 24 * 3600): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const fullPayload: TokenPayload = { ...payload, iat, exp };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Valida assinatura e expiração do token usando tempo constante contra timing attacks.
 */
export function verifyToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  // 1. Valida cabeçalho
  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
  } catch {
    return null;
  }

  // 2. Valida assinatura HMAC
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = crypto
    .createHmac('sha256', getAuthSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf = Buffer.from(signature);
  const expSigBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
    return null;
  }

  // 3. Valida payload e expiração
  try {
    const payload: TokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.userId || !payload.exp) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
