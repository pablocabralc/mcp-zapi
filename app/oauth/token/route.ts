import { loadClient } from '@/oauth/clients';
import { s256, signJwt, timingSafeEqual, verifyJwt } from '@/oauth/jwt';
import { CORS_HEADERS, json, oauthError } from '@/oauth/metadata';

const ACCESS_TTL_SECONDS = 60 * 60; // 1 hora
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dias

type CodePayload = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  resource: string;
  sub: string;
};

type RefreshPayload = {
  client_id: string;
  scope: string;
  resource: string;
  sub: string;
};

/** Emite o par access/refresh token para um sujeito ja autenticado. */
async function issueTokens(subject: string, clientId: string, scope: string, resource: string) {
  const claims = { client_id: clientId, scope, resource, sub: subject };

  const [accessToken, refreshToken] = await Promise.all([
    // RFC 8707: o `aud` amarra o token ao recurso solicitado, impedindo que
    // um token emitido para outro servidor seja aceito aqui.
    signJwt('access', claims, ACCESS_TTL_SECONDS, resource || undefined),
    signJwt('refresh', claims, REFRESH_TTL_SECONDS),
  ]);

  return json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
  });
}

export async function POST(req: Request) {
  let form: URLSearchParams;
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      form = new URLSearchParams(Object.entries((await req.json()) as Record<string, string>));
    } else {
      form = new URLSearchParams(await req.text());
    }
  } catch {
    return oauthError('invalid_request', 'Nao foi possivel ler os parametros da requisicao.');
  }

  const grantType = form.get('grant_type') ?? '';
  const clientId = form.get('client_id') ?? '';

  if (!clientId) {
    return oauthError('invalid_client', 'client_id e obrigatorio (cliente publico, autenticado via PKCE).');
  }
  try {
    await loadClient(clientId);
  } catch {
    return oauthError('invalid_client', 'client_id invalido ou nao emitido por este servidor.', 401);
  }

  if (grantType === 'authorization_code') {
    const code = form.get('code');
    const codeVerifier = form.get('code_verifier');
    const redirectUri = form.get('redirect_uri');

    if (!code) return oauthError('invalid_request', 'code e obrigatorio.');
    if (!codeVerifier) return oauthError('invalid_request', 'code_verifier e obrigatorio (PKCE).');

    let payload: CodePayload;
    try {
      payload = await verifyJwt<CodePayload & Record<string, unknown>>('code', code);
    } catch {
      return oauthError('invalid_grant', 'Authorization code invalido ou expirado.');
    }

    if (payload.client_id !== clientId) {
      return oauthError('invalid_grant', 'O code foi emitido para outro client_id.');
    }
    if (redirectUri && redirectUri !== payload.redirect_uri) {
      return oauthError('invalid_grant', 'redirect_uri diferente da usada na autorizacao.');
    }

    // Verificacao PKCE S256.
    const challenge = await s256(codeVerifier);
    if (!timingSafeEqual(challenge, payload.code_challenge)) {
      return oauthError('invalid_grant', 'code_verifier nao corresponde ao code_challenge.');
    }

    // RFC 8707: se o cliente indicar um resource, ele deve bater com o da autorizacao.
    const requestedResource = form.get('resource') ?? payload.resource ?? '';
    if (payload.resource && requestedResource && requestedResource !== payload.resource) {
      return oauthError('invalid_target', 'O resource solicitado difere do autorizado.');
    }

    return issueTokens(payload.sub, clientId, payload.scope, requestedResource);
  }

  if (grantType === 'refresh_token') {
    const refreshToken = form.get('refresh_token');
    if (!refreshToken) return oauthError('invalid_request', 'refresh_token e obrigatorio.');

    let payload: RefreshPayload;
    try {
      payload = await verifyJwt<RefreshPayload & Record<string, unknown>>('refresh', refreshToken);
    } catch {
      return oauthError('invalid_grant', 'refresh_token invalido ou expirado.');
    }

    if (payload.client_id !== clientId) {
      return oauthError('invalid_grant', 'O refresh_token foi emitido para outro client_id.');
    }

    // O escopo pode ser reduzido no refresh, nunca ampliado.
    const granted = payload.scope.split(/\s+/).filter(Boolean);
    const requested = (form.get('scope') ?? '').split(/\s+/).filter(Boolean);
    if (requested.some((s) => !granted.includes(s))) {
      return oauthError('invalid_scope', 'O refresh nao pode ampliar o escopo concedido originalmente.');
    }
    const scope = requested.length > 0 ? requested.join(' ') : payload.scope;

    return issueTokens(payload.sub, clientId, scope, form.get('resource') ?? payload.resource ?? '');
  }

  return oauthError(
    'unsupported_grant_type',
    `grant_type "${grantType}" nao suportado. Use authorization_code ou refresh_token.`,
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
