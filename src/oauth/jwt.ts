import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { OAUTH_JWT_SECRET } from '@/lib/env';

/**
 * OAuth 2.1 stateless: nao ha banco de dados. Todos os artefatos (client_id,
 * authorization code, access token e refresh token) sao JWTs HMAC assinados
 * com OAUTH_JWT_SECRET e carregam seu proprio estado.
 */

export type TokenType = 'client' | 'code' | 'access' | 'refresh';

let cachedKey: Uint8Array | undefined;

function secretKey(): Uint8Array {
  if (!OAUTH_JWT_SECRET) {
    throw new Error(
      'OAUTH_JWT_SECRET nao configurado. Gere um valor aleatorio (ex.: `openssl rand -hex 32`) e defina a variavel de ambiente.',
    );
  }
  if (OAUTH_JWT_SECRET.length < 32) {
    throw new Error('OAUTH_JWT_SECRET deve ter no minimo 32 caracteres.');
  }
  cachedKey ??= new TextEncoder().encode(OAUTH_JWT_SECRET);
  return cachedKey;
}

export async function signJwt(
  type: TokenType,
  payload: JWTPayload,
  expiresInSeconds: number,
  audience?: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  let jwt = new SignJWT({ ...payload, typ: type })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .setJti(crypto.randomUUID());
  if (audience) jwt = jwt.setAudience(audience);
  return jwt.sign(secretKey());
}

export async function verifyJwt<T extends JWTPayload = JWTPayload>(
  type: TokenType,
  token: string,
  audience?: string,
): Promise<T> {
  const { payload } = await jwtVerify(token, secretKey(), audience ? { audience } : undefined);
  if (payload.typ !== type) {
    throw new Error(`Tipo de token invalido: esperado "${type}", recebido "${String(payload.typ)}".`);
  }
  return payload as T;
}

/* ------------------------------- PKCE (S256) ------------------------------ */

function base64url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Calcula o code_challenge S256 de um code_verifier. */
export async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(digest);
}

/** Comparacao em tempo constante, para senhas e segredos. */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i]! ^ bBytes[i]!;
  return diff === 0;
}
