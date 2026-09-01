import { baseUrl } from '@/lib/env';

/** Escopos suportados por este servidor. */
export const SUPPORTED_SCOPES = ['zapi:read', 'zapi:write'] as const;
export const DEFAULT_SCOPE = SUPPORTED_SCOPES.join(' ');

/** Cabecalhos CORS exigidos pelos clientes MCP em navegador. */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
  'Access-Control-Max-Age': '86400',
};

export function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export function oauthError(error: string, description: string, status = 400): Response {
  return json({ error, error_description: description }, { status });
}

/** RFC 9728 — Protected Resource Metadata. */
export function protectedResourceMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported: [...SUPPORTED_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'MCP Z-API (WhatsApp)',
    resource_documentation: 'https://developer.z-api.io/api-reference/introduction',
  };
}

/** RFC 8414 — Authorization Server Metadata (perfil OAuth 2.1). */
export function authorizationServerMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    scopes_supported: [...SUPPORTED_SCOPES],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    // OAuth 2.1: PKCE obrigatorio, apenas S256.
    code_challenge_methods_supported: ['S256'],
    // RFC 8707 — Resource Indicators.
    resource_indicators_supported: true,
  };
}
