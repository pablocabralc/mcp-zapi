/**
 * Configuracao via variaveis de ambiente.
 *
 * Credenciais Z-API (https://app.z-api.io):
 *   ZAPI_INSTANCE_ID     -> ID da instancia
 *   ZAPI_INSTANCE_TOKEN  -> Token da instancia
 *   ZAPI_CLIENT_TOKEN    -> Token de seguranca da conta (header `Client-Token`)
 *   ZAPI_BASE_URL        -> opcional, default https://api.z-api.io
 *   ZAPI_PARTNER_TOKEN   -> opcional, token de parceiro (header `Partner-Token`)
 *   ZAPI_INSTANCES       -> opcional, JSON com instancias extras nomeadas:
 *       {"vendas":{"instanceId":"...","instanceToken":"...","clientToken":"..."}}
 */

export type ZapiCredentials = {
  instanceId: string;
  instanceToken: string;
  clientToken?: string;
};

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

export const ZAPI_BASE_URL = (optional('ZAPI_BASE_URL') ?? 'https://api.z-api.io').replace(/\/+$/, '');
export const ZAPI_PARTNER_TOKEN = optional('ZAPI_PARTNER_TOKEN');

/** Instancias nomeadas extras, para contas multi-instancia. */
export function namedInstances(): Record<string, ZapiCredentials> {
  const raw = optional('ZAPI_INSTANCES');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<ZapiCredentials>>;
    const out: Record<string, ZapiCredentials> = {};
    for (const [alias, cred] of Object.entries(parsed)) {
      if (cred?.instanceId && cred?.instanceToken) {
        out[alias] = {
          instanceId: cred.instanceId,
          instanceToken: cred.instanceToken,
          clientToken: cred.clientToken ?? optional('ZAPI_CLIENT_TOKEN'),
        };
      }
    }
    return out;
  } catch {
    throw new Error('ZAPI_INSTANCES nao e um JSON valido.');
  }
}

/** Resolve as credenciais a usar; `alias` seleciona uma instancia de ZAPI_INSTANCES. */
export function resolveCredentials(alias?: string): ZapiCredentials {
  if (alias) {
    const found = namedInstances()[alias];
    if (!found) {
      const known = Object.keys(namedInstances());
      throw new Error(
        `Instancia "${alias}" nao encontrada em ZAPI_INSTANCES.` +
          (known.length ? ` Disponiveis: ${known.join(', ')}.` : ' Nenhuma instancia nomeada configurada.'),
      );
    }
    return found;
  }

  const instanceId = optional('ZAPI_INSTANCE_ID');
  const instanceToken = optional('ZAPI_INSTANCE_TOKEN');
  if (!instanceId || !instanceToken) {
    throw new Error(
      'Credenciais Z-API ausentes. Defina ZAPI_INSTANCE_ID e ZAPI_INSTANCE_TOKEN nas variaveis de ambiente.',
    );
  }
  return { instanceId, instanceToken, clientToken: optional('ZAPI_CLIENT_TOKEN') };
}

/* ------------------------------- OAuth 2.1 ------------------------------- */

export const OAUTH_JWT_SECRET = optional('OAUTH_JWT_SECRET');
export const OAUTH_LOGIN_PASSWORD = optional('OAUTH_LOGIN_PASSWORD');
export const OAUTH_LOGIN_USERNAME = optional('OAUTH_LOGIN_USERNAME') ?? 'admin';
/** Desliga a exigencia de OAuth (apenas para desenvolvimento local). */
export const MCP_DISABLE_AUTH = optional('MCP_DISABLE_AUTH') === 'true';

/** URL publica base, usada como `issuer` e `resource` do OAuth. */
export function baseUrl(req?: Request): string {
  const explicit = optional('OAUTH_ISSUER') ?? optional('NEXT_PUBLIC_BASE_URL');
  if (explicit) return explicit.replace(/\/+$/, '');

  if (req) {
    const url = new URL(req.url);
    const host = req.headers.get('x-forwarded-host') ?? url.host;
    const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  const vercel = optional('VERCEL_PROJECT_PRODUCTION_URL') ?? optional('VERCEL_URL');
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
