import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, type ToolDef } from '@/lib/tool';

/** Lista de excecao usada quando a visibilidade e CONTACT_BLACKLIST. */
const contactsBlacklist = z
  .array(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('"add" inclui o contato na lista de excecao; "remove" retira o contato da lista.'),
      phone: z.string().describe('Numero do contato no formato DDI+DDD+numero (ex.: 5511999999999).'),
    }),
  )
  .optional()
  .describe('Opcional. Contatos a adicionar/remover da lista de excecao (usado com CONTACT_BLACKLIST).');

/** Configuracoes de privacidade da conta do WhatsApp (visto por ultimo, foto, recado, grupos, etc.). */
export const privacyTools: ToolDef[] = [
  defineTool({
    name: 'zapi_get_disallowed_contacts',
    title: 'Listar contatos da blacklist de privacidade',
    description:
      'Lista a blacklist de privacidade do tipo informado, ou seja, os contatos colocados na lista de excecao que NAO enxergam aquele dado do seu perfil. Use o parametro "type" para escolher qual configuracao consultar: visto por ultimo, foto de perfil, recado ou adicao em grupos. Faz sentido apenas quando a configuracao esta como CONTACT_BLACKLIST. GET /privacy/disallowed-contacts',
    inputSchema: {
      type: z
        .enum(['lastSeen', 'photo', 'description', 'groupAdd'])
        .describe(
          'Configuracao de privacidade a consultar: "lastSeen" (visto por ultimo), "photo" (foto de perfil), "description" (recado do perfil) ou "groupAdd" (quem pode te adicionar em grupos).',
        ),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/privacy/disallowed-contacts', {
        query: { type: args.type },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_set_last_seen',
    title: 'Definir quem ve o visto por ultimo',
    description:
      'Define quem pode ver o seu "visto por ultimo" (horario da sua ultima presenca no WhatsApp). Aceita ALL (todos), NONE (ninguem), CONTACTS (apenas seus contatos) ou CONTACT_BLACKLIST (seus contatos, exceto os informados em contactsBlacklist). Atencao: ao esconder o seu visto por ultimo voce tambem deixa de ver o dos outros. POST /privacy/last-seen',
    inputSchema: {
      visualizationType: z
        .enum(['ALL', 'NONE', 'CONTACTS', 'CONTACT_BLACKLIST'])
        .describe(
          'Quem pode ver o visto por ultimo: "ALL" (todos), "NONE" (ninguem), "CONTACTS" (somente contatos) ou "CONTACT_BLACKLIST" (contatos, exceto os da lista de excecao).',
        ),
      contactsBlacklist,
    },
    handler: (args) =>
      zapiRequest('POST', '/privacy/last-seen', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_photo_visualization',
    title: 'Definir quem ve a foto de perfil',
    description:
      'Define quem pode ver a foto de perfil da sua conta. Aceita ALL (todos), NONE (ninguem), CONTACTS (apenas seus contatos) ou CONTACT_BLACKLIST (seus contatos, exceto os informados em contactsBlacklist). POST /privacy/photo-visualization',
    inputSchema: {
      visualizationType: z
        .enum(['ALL', 'NONE', 'CONTACTS', 'CONTACT_BLACKLIST'])
        .describe(
          'Quem pode ver a foto de perfil: "ALL" (todos), "NONE" (ninguem), "CONTACTS" (somente contatos) ou "CONTACT_BLACKLIST" (contatos, exceto os da lista de excecao).',
        ),
      contactsBlacklist,
    },
    handler: (args) =>
      zapiRequest('POST', '/privacy/photo-visualization', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_privacy_description',
    title: 'Definir quem ve o recado do perfil',
    description:
      'Define quem pode ver o recado (texto de descricao/status do perfil) da sua conta. Aceita ALL (todos), NONE (ninguem), CONTACTS (apenas seus contatos) ou CONTACT_BLACKLIST (seus contatos, exceto os informados em contactsBlacklist). POST /privacy/description',
    inputSchema: {
      visualizationType: z
        .enum(['ALL', 'NONE', 'CONTACTS', 'CONTACT_BLACKLIST'])
        .describe(
          'Quem pode ver o recado do perfil: "ALL" (todos), "NONE" (ninguem), "CONTACTS" (somente contatos) ou "CONTACT_BLACKLIST" (contatos, exceto os da lista de excecao).',
        ),
      contactsBlacklist,
    },
    handler: (args) =>
      zapiRequest('POST', '/privacy/description', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_group_add_permission',
    title: 'Definir quem pode te adicionar em grupos',
    description:
      'Define quem pode te adicionar em grupos do WhatsApp. Atencao: neste endpoint o campo se chama "type" (e nao "visualizationType") e a opcao "NONE" nao e aceita — use ALL (qualquer pessoa), CONTACTS (apenas seus contatos) ou CONTACT_BLACKLIST (seus contatos, exceto os informados em contactsBlacklist). POST /privacy/group-add',
    inputSchema: {
      type: z
        .enum(['ALL', 'CONTACTS', 'CONTACT_BLACKLIST'])
        .describe(
          'Quem pode te adicionar em grupos: "ALL" (qualquer pessoa), "CONTACTS" (somente contatos) ou "CONTACT_BLACKLIST" (contatos, exceto os da lista de excecao). A opcao "NONE" nao existe aqui.',
        ),
      contactsBlacklist,
    },
    handler: (args) =>
      zapiRequest('POST', '/privacy/group-add', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_privacy_online',
    title: 'Definir quem ve quando voce esta online',
    description:
      'Define quem pode ver quando voce esta online (presenca em tempo real no WhatsApp). Aceita ALL (todos veem que voce esta online) ou SAME_LAST_SEEN (segue a mesma regra ja configurada no "visto por ultimo"). POST /privacy/online',
    inputSchema: {
      visualizationType: z
        .enum(['ALL', 'SAME_LAST_SEEN'])
        .describe(
          'Quem pode ver que voce esta online: "ALL" (todos) ou "SAME_LAST_SEEN" (mesma configuracao usada no visto por ultimo).',
        ),
    },
    handler: (args) => zapiRequest('POST', '/privacy/online', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_read_receipts',
    title: 'Ativar ou desativar confirmacao de leitura',
    description:
      'Ativa ou desativa a confirmacao de leitura (o "tique azul"). Ao desativar, voce tambem deixa de ver a confirmacao de leitura dos outros. Nao se aplica a mensagens de grupos, que sempre exibem a confirmacao. O valor e enviado na query string. POST /privacy/read-receipts',
    inputSchema: {
      value: z
        .enum(['enable', 'disable'])
        .describe(
          '"enable" ativa a confirmacao de leitura (tique azul); "disable" desativa, escondendo a sua leitura e tambem a dos outros para voce.',
        ),
    },
    handler: (args) =>
      zapiRequest('POST', '/privacy/read-receipts', {
        query: { value: args.value },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_set_messages_duration',
    title: 'Definir duracao das mensagens temporarias',
    description:
      'Define a duracao padrao das mensagens temporarias aplicada as NOVAS conversas iniciadas a partir de agora (as conversas ja existentes nao sao alteradas). Aceita days90 (90 dias), days7 (7 dias), hours24 (24 horas) ou disable (desativa as mensagens temporarias). O valor e enviado na query string. POST /privacy/messages-duration',
    inputSchema: {
      value: z
        .enum(['days90', 'days7', 'hours24', 'disable'])
        .describe(
          'Duracao padrao das mensagens temporarias em novas conversas: "days90" (90 dias), "days7" (7 dias), "hours24" (24 horas) ou "disable" (desativado).',
        ),
    },
    handler: (args) =>
      zapiRequest('POST', '/privacy/messages-duration', {
        query: { value: args.value },
        instanceAlias: args.instanceAlias,
      }),
  }),
];
