import { isAllowedRedirectUri, registerClient } from '@/oauth/clients';
import { CORS_HEADERS, DEFAULT_SCOPE, json, oauthError } from '@/oauth/metadata';

/**
 * RFC 7591 — Dynamic Client Registration.
 * O `client_id` retornado e um JWT auto-contido: nao ha storage no servidor.
 */
export async function POST(req: Request) {
  let body: { redirect_uris?: unknown; client_name?: unknown; scope?: unknown };
  try {
    body = await req.json();
  } catch {
    return oauthError('invalid_client_metadata', 'Corpo da requisicao nao e JSON valido.');
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthError('invalid_redirect_uri', 'redirect_uris e obrigatorio e deve ser um array nao vazio.');
  }
  if (!redirectUris.every((uri): uri is string => typeof uri === 'string' && isAllowedRedirectUri(uri))) {
    return oauthError(
      'invalid_redirect_uri',
      'Cada redirect_uri deve ser HTTPS, http em loopback (localhost/127.0.0.1) ou um esquema proprio de app nativo, sem fragmento.',
    );
  }

  const clientName = typeof body.client_name === 'string' ? body.client_name : undefined;
  const scope = typeof body.scope === 'string' ? body.scope : DEFAULT_SCOPE;

  const clientId = await registerClient({ redirect_uris: redirectUris, client_name: clientName, scope });

  return json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: clientName,
      scope,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      // Cliente publico: PKCE substitui o segredo (OAuth 2.1).
      token_endpoint_auth_method: 'none',
    },
    { status: 201 },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
