import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import { baseUrl, MCP_DISABLE_AUTH } from '@/lib/env';
import { ZapiError } from '@/lib/zapi-client';
import { verifyJwt } from '@/oauth/jwt';
import { allTools, assertUniqueToolNames } from '@/tools';

export const maxDuration = 300;

assertUniqueToolNames();

const handler = createMcpHandler(
  (server) => {
    for (const tool of allTools) {
      server.registerTool(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: { openWorldHint: true, ...tool.annotations },
        },
        async (args: Record<string, unknown>) => {
          try {
            const result = await tool.handler(args ?? {});
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            };
          } catch (error) {
            const message =
              error instanceof ZapiError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : String(error);
            return {
              isError: true,
              content: [{ type: 'text' as const, text: `Erro em ${tool.name}: ${message}` }],
            };
          }
        },
      );
    }
  },
  {
    serverInfo: { name: 'mcp-zapi', version: '1.0.0' },
    instructions:
      'Servidor MCP com a API completa da Z-API (WhatsApp). As credenciais da instancia vem das variaveis ' +
      'de ambiente do servidor — nunca peca token ao usuario. Use zapi_get_status antes de enviar mensagens ' +
      'se houver duvida sobre a conexao. Numeros seguem o formato DDI+DDD+numero (ex.: 5511999999999) e ' +
      'grupos usam o ID terminado em @g.us.',
  },
  { basePath: '/api' },
);

/** Valida o Bearer token emitido pelo proprio servidor OAuth 2.1 deste projeto. */
async function verifyToken(req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const resource = `${baseUrl(req)}/api/mcp`;
  try {
    const payload = await verifyJwt<{
      client_id: string;
      scope?: string;
      sub?: string;
      exp?: number;
    }>('access', bearerToken, resource);

    return {
      token: bearerToken,
      clientId: payload.client_id,
      scopes: (payload.scope ?? '').split(/\s+/).filter(Boolean),
      expiresAt: payload.exp,
      extra: { sub: payload.sub },
    };
  } catch {
    return undefined;
  }
}

const authenticated = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

// MCP_DISABLE_AUTH=true libera o servidor sem OAuth — use apenas localmente.
const exported = MCP_DISABLE_AUTH ? handler : authenticated;

export { exported as GET, exported as POST, exported as DELETE };
