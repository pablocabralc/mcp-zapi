import type { ToolDef } from '@/lib/tool';

import { businessCatalogTools } from './business-catalog';
import { businessProfileTools } from './business-profile';
import { chatsContactsTools } from './chats-contacts';
import { communityTools } from './communities';
import { groupTools } from './groups';
import { instanceTools } from './instance';
import { messagesInteractiveTools } from './messages-interactive';
import { messagesMediaTools } from './messages-media';
import { mobileSecurityTools } from './mobile-security';
import { newsletterCallsTools } from './newsletter-calls';
import { partnerTools } from './partner';
import { privacyTools } from './privacy';
import { statusTools } from './status';
import { webhooksQueueTools } from './webhooks-queue';

/** Todas as tools do servidor, agrupadas por area da API da Z-API. */
export const toolGroups: Record<string, ToolDef[]> = {
  instancia: instanceTools,
  mensagens: messagesMediaTools,
  'mensagens-interativas': messagesInteractiveTools,
  'chats-contatos': chatsContactsTools,
  grupos: groupTools,
  comunidades: communityTools,
  canais: newsletterCallsTools,
  status: statusTools,
  'catalogo-business': businessCatalogTools,
  'perfil-business': businessProfileTools,
  webhooks: webhooksQueueTools,
  privacidade: privacyTools,
  'mobile-seguranca': mobileSecurityTools,
  parceiro: partnerTools,
};

/**
 * Alguns clientes MCP degradam com centenas de tools. `ZAPI_TOOL_GROUPS` aceita
 * uma lista separada por virgula com as chaves de `toolGroups` a expor
 * (ex.: "instancia,mensagens,grupos"). Sem a variavel, expoe todas.
 */
function enabledGroups(): string[] {
  const raw = process.env.ZAPI_TOOL_GROUPS?.trim();
  const known = Object.keys(toolGroups);
  if (!raw) return known;

  const requested = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = requested.filter((g) => !known.includes(g));
  if (unknown.length > 0) {
    throw new Error(
      `ZAPI_TOOL_GROUPS contem grupo(s) desconhecido(s): ${unknown.join(', ')}. Validos: ${known.join(', ')}.`,
    );
  }
  return requested;
}

export const allTools: ToolDef[] = enabledGroups().flatMap((group) => toolGroups[group] ?? []);

/** Falha cedo se dois grupos declararem a mesma tool. */
export function assertUniqueToolNames(): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const tool of allTools) {
    if (seen.has(tool.name)) duplicates.push(tool.name);
    seen.add(tool.name);
  }
  if (duplicates.length > 0) {
    throw new Error(`Tools com nome duplicado: ${[...new Set(duplicates)].join(', ')}`);
  }
}
