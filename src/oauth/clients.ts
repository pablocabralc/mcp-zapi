import { signJwt, verifyJwt } from './jwt';

/**
 * Dynamic Client Registration (RFC 7591) sem storage: o proprio `client_id`
 * e um JWT assinado que carrega os metadados do cliente. Assim a Vercel roda
 * sem banco de dados e qualquer instancia da function valida o mesmo client_id.
 */

export type ClientMetadata = {
  redirect_uris: string[];
  client_name?: string;
  scope?: string;
};

/** Um ano — o client_id nao expira na pratica, mas o JWT precisa de `exp`. */
const CLIENT_TTL_SECONDS = 365 * 24 * 60 * 60;

export async function registerClient(metadata: ClientMetadata): Promise<string> {
  return signJwt('client', metadata as unknown as Record<string, unknown>, CLIENT_TTL_SECONDS);
}

export async function loadClient(clientId: string): Promise<ClientMetadata> {
  const payload = await verifyJwt<ClientMetadata & { typ: string }>('client', clientId);
  if (!Array.isArray(payload.redirect_uris) || payload.redirect_uris.length === 0) {
    throw new Error('client_id nao contem redirect_uris.');
  }
  return { redirect_uris: payload.redirect_uris, client_name: payload.client_name, scope: payload.scope };
}

/**
 * OAuth 2.1 exige comparacao exata de redirect_uri (sem wildcards nem
 * correspondencia por prefixo).
 */
export function isRegisteredRedirectUri(client: ClientMetadata, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri);
}

/** Valida uma redirect_uri conforme OAuth 2.1: HTTPS, loopback HTTP, ou esquema proprio. */
export function isAllowedRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.hash) return false;
  if (parsed.protocol === 'https:') return true;
  if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]')) {
    return true;
  }
  // Esquema proprio de aplicativo nativo (ex.: `cursor://`, `vscode://`).
  return /^[a-z][a-z0-9+.-]*:$/.test(parsed.protocol) && parsed.protocol !== 'http:';
}
