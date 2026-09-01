import { OAUTH_LOGIN_PASSWORD, OAUTH_LOGIN_USERNAME } from '@/lib/env';
import { isRegisteredRedirectUri, loadClient, type ClientMetadata } from '@/oauth/clients';
import { signJwt, timingSafeEqual } from '@/oauth/jwt';
import { CORS_HEADERS, DEFAULT_SCOPE, oauthError, SUPPORTED_SCOPES } from '@/oauth/metadata';

/** Codigo de autorizacao e de vida curta (OAuth 2.1 recomenda no maximo 60s). */
const CODE_TTL_SECONDS = 60;

type AuthParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  resource: string;
};

/** Valida os parametros comuns a GET e POST; devolve erro ou os dados prontos. */
async function validate(
  source: URLSearchParams,
): Promise<{ error: Response } | { params: AuthParams; client: ClientMetadata }> {
  const clientId = source.get('client_id');
  const redirectUri = source.get('redirect_uri');
  const responseType = source.get('response_type') ?? '';
  const codeChallenge = source.get('code_challenge');
  const challengeMethod = source.get('code_challenge_method') ?? '';

  if (!clientId) return { error: oauthError('invalid_request', 'client_id e obrigatorio.') };
  if (!redirectUri) return { error: oauthError('invalid_request', 'redirect_uri e obrigatorio.') };

  let client: ClientMetadata;
  try {
    client = await loadClient(clientId);
  } catch {
    return { error: oauthError('invalid_client', 'client_id invalido, expirado ou nao emitido por este servidor.') };
  }

  if (!isRegisteredRedirectUri(client, redirectUri)) {
    return { error: oauthError('invalid_request', 'redirect_uri nao corresponde exatamente a nenhuma URI registrada.') };
  }

  // A partir daqui os erros poderiam ir para a redirect_uri, mas responder
  // diretamente e mais claro para quem esta configurando o servidor.
  if (responseType !== 'code') {
    return { error: oauthError('unsupported_response_type', 'Apenas response_type=code e suportado.') };
  }
  if (!codeChallenge) {
    return { error: oauthError('invalid_request', 'code_challenge e obrigatorio (PKCE e exigido pelo OAuth 2.1).') };
  }
  if (challengeMethod !== 'S256') {
    return { error: oauthError('invalid_request', 'code_challenge_method deve ser S256.') };
  }

  const requested = (source.get('scope') || DEFAULT_SCOPE).split(/\s+/).filter(Boolean);
  const unknown = requested.filter((s) => !SUPPORTED_SCOPES.includes(s as (typeof SUPPORTED_SCOPES)[number]));
  if (unknown.length > 0) {
    return { error: oauthError('invalid_scope', `Escopo(s) nao suportado(s): ${unknown.join(', ')}.`) };
  }

  return {
    params: {
      clientId,
      redirectUri,
      state: source.get('state') ?? '',
      scope: requested.join(' '),
      codeChallenge,
      resource: source.get('resource') ?? '',
    },
    client,
  };
}

/** GET — exibe a tela de consentimento/login. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const result = await validate(url.searchParams);
  if ('error' in result) return result.error;

  if (!OAUTH_LOGIN_PASSWORD) {
    return oauthError(
      'server_error',
      'OAUTH_LOGIN_PASSWORD nao configurado no servidor. Defina a variavel de ambiente para autorizar clientes.',
      500,
    );
  }

  return new Response(loginPage(result.params, result.client, url.searchParams.get('error')), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** POST — valida as credenciais e redireciona com o authorization code. */
export async function POST(req: Request) {
  const form = await req.formData();
  const source = new URLSearchParams();
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') source.set(key, value);
  }

  const result = await validate(source);
  if ('error' in result) return result.error;
  const { params } = result;

  if (!OAUTH_LOGIN_PASSWORD) {
    return oauthError('server_error', 'OAUTH_LOGIN_PASSWORD nao configurado no servidor.', 500);
  }

  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  const ok = timingSafeEqual(username, OAUTH_LOGIN_USERNAME) && timingSafeEqual(password, OAUTH_LOGIN_PASSWORD);

  if (!ok) {
    // Reexibe o formulario com a mensagem de erro, preservando os parametros.
    const retry = new URLSearchParams(source);
    retry.delete('username');
    retry.delete('password');
    retry.set('error', 'Usuario ou senha incorretos.');
    return Response.redirect(new URL(`/oauth/authorize?${retry.toString()}`, req.url), 303);
  }

  const code = await signJwt(
    'code',
    {
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      scope: params.scope,
      resource: params.resource,
      sub: OAUTH_LOGIN_USERNAME,
    },
    CODE_TTL_SECONDS,
  );

  const target = new URL(params.redirectUri);
  target.searchParams.set('code', code);
  if (params.state) target.searchParams.set('state', params.state);

  return Response.redirect(target.toString(), 303);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ------------------------------ tela de login ----------------------------- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loginPage(params: AuthParams, client: ClientMetadata, error: string | null): string {
  const hidden = (
    [
      ['response_type', 'code'],
      ['client_id', params.clientId],
      ['redirect_uri', params.redirectUri],
      ['state', params.state],
      ['scope', params.scope],
      ['code_challenge', params.codeChallenge],
      ['code_challenge_method', 'S256'],
      ['resource', params.resource],
    ] as const
  )
    .filter(([, value]) => value !== '')
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join('\n      ');

  const appName = escapeHtml(client.client_name ?? 'Cliente MCP');
  const scopes = params.scope
    .split(' ')
    .map((s) => `<li><code>${escapeHtml(s)}</code></li>`)
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Autorizar acesso — MCP Z-API</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f7f9; --card:#fff; --fg:#111827; --muted:#6b7280; --line:#e5e7eb; --accent:#16a34a; --errbg:#fee2e2; --errfg:#991b1b; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0b0f14; --card:#141a21; --fg:#e5e7eb; --muted:#9ca3af; --line:#263140; --errbg:#3f1d1d; --errfg:#fecaca; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px;
         background:var(--bg); color:var(--fg);
         font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  .card { width:100%; max-width:420px; background:var(--card); border:1px solid var(--line);
          border-radius:14px; padding:28px; box-shadow:0 1px 3px rgb(0 0 0 / .08); }
  h1 { margin:0 0 4px; font-size:19px; }
  p.sub { margin:0 0 20px; color:var(--muted); font-size:14px; }
  ul { margin:0 0 20px; padding-left:20px; color:var(--muted); font-size:13px; }
  code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 6px; }
  input[type=text], input[type=password] {
    width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px;
    background:transparent; color:inherit; font-size:15px; }
  input:focus { outline:2px solid var(--accent); outline-offset:1px; }
  button { width:100%; margin-top:22px; padding:11px; border:0; border-radius:8px;
           background:var(--accent); color:#fff; font-size:15px; font-weight:600; cursor:pointer; }
  button:hover { filter:brightness(1.07); }
  .err { margin:0 0 16px; padding:10px 12px; border-radius:8px; font-size:13px;
         background:var(--errbg); color:var(--errfg); }
</style>
</head>
<body>
  <main class="card">
    <h1>Autorizar acesso</h1>
    <p class="sub"><strong>${appName}</strong> quer acessar sua conta Z-API (WhatsApp) via MCP.</p>
    ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}
    <p class="sub" style="margin-bottom:6px">Permissoes solicitadas:</p>
    <ul>${scopes}</ul>
    <form method="post" action="/oauth/authorize">
      ${hidden}
      <label for="username">Usuario</label>
      <input id="username" name="username" type="text" autocomplete="username" value="${escapeHtml(
        OAUTH_LOGIN_USERNAME,
      )}" required>
      <label for="password">Senha</label>
      <input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
      <button type="submit">Autorizar</button>
    </form>
  </main>
</body>
</html>`;
}
