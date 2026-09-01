import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, type ToolDef } from '@/lib/tool';

/** Comunidades do WhatsApp e listas de transmissao (broadcast). */
export const communityTools: ToolDef[] = [
  defineTool({
    name: 'zapi_create_community',
    title: 'Criar comunidade',
    description:
      'Cria uma nova comunidade no WhatsApp. A comunidade e criada tendo a instancia conectada como administradora e ja nasce com o grupo de avisos padrao. Depois de criada, use zapi_link_groups_to_community para vincular grupos existentes e zapi_add_community_participant para adicionar participantes. POST /communities',
    inputSchema: {
      name: z.string().describe('Nome da comunidade que sera criada.'),
      description: z.string().optional().describe('Opcional. Descricao/assunto da comunidade exibido aos participantes.'),
    },
    handler: (args) => zapiRequest('POST', '/communities', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_list_communities',
    title: 'Listar comunidades',
    description:
      'Lista as comunidades das quais a instancia conectada participa, com paginacao. Retorna dados basicos de cada comunidade (id no formato ...@g.us, nome, descricao e grupos vinculados). GET /communities',
    inputSchema: {
      page: z.number().int().optional().describe('Opcional. Numero da pagina a consultar.'),
      pageSize: z.number().int().optional().describe('Opcional. Quantidade de comunidades retornadas por pagina.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/communities', {
        query: { page: args.page, pageSize: args.pageSize },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_link_groups_to_community',
    title: 'Vincular grupos a comunidade',
    description:
      'Vincula um ou mais grupos ja existentes a uma comunidade. A instancia conectada precisa ser administradora tanto da comunidade quanto dos grupos informados. POST /communities/link',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade que recebera os grupos (ex.: 120363019502650977@g.us).'),
      groupsPhones: z
        .array(z.string())
        .describe('Lista de IDs dos grupos a vincular (ex.: ["120363019502650977-group@g.us"]).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/communities/link', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_unlink_groups_from_community',
    title: 'Desvincular grupos da comunidade',
    description:
      'Remove o vinculo de um ou mais grupos com a comunidade. Atencao: a comunidade deve permanecer com pelo menos 1 grupo vinculado, entao nao e possivel desvincular todos os grupos de uma vez. A instancia conectada precisa ser administradora da comunidade. POST /communities/unlink',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade da qual os grupos serao desvinculados (ex.: 120363019502650977@g.us).'),
      groupsPhones: z
        .array(z.string())
        .describe('Lista de IDs dos grupos a desvincular. Deve restar ao menos 1 grupo vinculado a comunidade.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/communities/unlink', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_community_metadata',
    title: 'Obter metadados da comunidade',
    description:
      'Retorna os metadados completos de uma comunidade: nome, descricao, dono, link de convite, lista de administradores, participantes e grupos vinculados. GET /communities-metadata/{communityId}',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade a consultar (ex.: 120363019502650977@g.us).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/communities-metadata/${encodeURIComponent(args.communityId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_redefine_community_invitation_link',
    title: 'Redefinir link de convite da comunidade',
    description:
      'Gera um novo link de convite para a comunidade, invalidando imediatamente o link anterior. Util quando o link antigo vazou. Nao possui corpo na requisicao. POST /redefine-invitation-link/{communityId}',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade cujo link de convite sera redefinido (ex.: 120363019502650977@g.us).'),
    },
    handler: (args) =>
      zapiRequest('POST', `/redefine-invitation-link/${encodeURIComponent(args.communityId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_add_community_participant',
    title: 'Adicionar participante a comunidade',
    description:
      'Adiciona um ou mais participantes a uma comunidade. ATENCAO: este endpoint compartilha o mesmo path das tools de grupo (POST /add-participant), mas aqui o corpo usa o campo `communityId` no lugar de `groupId` — e isso que faz a Z-API tratar a operacao como comunidade e nao como grupo. POST /add-participant',
    inputSchema: {
      autoInvite: z
        .boolean()
        .describe(
          'Se true, envia convite por mensagem privada quando o contato nao puder ser adicionado diretamente (privacidade do numero). Se false, a adicao falha nesses casos.',
        ),
      communityId: z.string().describe('ID da comunidade (ex.: 120363019502650977@g.us). Substitui o `groupId` usado nas tools de grupo.'),
      phones: z
        .array(z.string())
        .describe('Lista de numeros no formato DDI+DDD+numero, sem simbolos (ex.: ["5511999999999"]).'),
    },
    handler: (args) => zapiRequest('POST', '/add-participant', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_community_participant',
    title: 'Remover participante da comunidade',
    description:
      'Remove um ou mais participantes de uma comunidade. Assim como na adicao, o corpo usa `communityId` no lugar de `groupId` para diferenciar de uma remocao em grupo. A instancia conectada precisa ser administradora. POST /remove-participant',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade (ex.: 120363019502650977@g.us). Substitui o `groupId` usado nas tools de grupo.'),
      phones: z
        .array(z.string())
        .describe('Lista de numeros a remover, no formato DDI+DDD+numero, sem simbolos (ex.: ["5511999999999"]).'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('POST', '/remove-participant', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_add_community_admin',
    title: 'Promover administradores da comunidade',
    description:
      'Promove um ou mais participantes a administradores da comunidade. O corpo usa `communityId` no lugar de `groupId` para diferenciar da promocao em grupos. POST /add-admin',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade (ex.: 120363019502650977@g.us).'),
      phones: z
        .array(z.string())
        .describe('Lista de numeros que serao promovidos a administradores, no formato DDI+DDD+numero (ex.: ["5511999999999"]).'),
    },
    handler: (args) => zapiRequest('POST', '/add-admin', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_community_admin',
    title: 'Rebaixar administradores da comunidade',
    description:
      'Remove o cargo de administrador de um ou mais participantes da comunidade, mantendo-os como membros comuns. O corpo usa `communityId` no lugar de `groupId`. POST /remove-admin',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade (ex.: 120363019502650977@g.us).'),
      phones: z
        .array(z.string())
        .describe('Lista de numeros que perderao o cargo de administrador, no formato DDI+DDD+numero (ex.: ["5511999999999"]).'),
    },
    handler: (args) => zapiRequest('POST', '/remove-admin', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_community_settings',
    title: 'Configurar permissoes da comunidade',
    description:
      'Altera as configuracoes da comunidade, definindo quem pode adicionar novos grupos a ela. POST /communities/settings',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade a configurar (ex.: 120363019502650977@g.us).'),
      whoCanAddNewGroups: z
        .enum(['admins', 'all'])
        .describe('Quem pode adicionar novos grupos: "admins" (somente administradores) ou "all" (todos os participantes).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/communities/settings', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_deactivate_community',
    title: 'Desativar comunidade',
    description:
      'Desativa (encerra) uma comunidade. Os grupos vinculados sao desvinculados e passam a existir de forma independente, mas a comunidade deixa de existir. Acao irreversivel — use com cuidado. DELETE /communities/{communityId}',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade a desativar (ex.: 120363019502650977@g.us).'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', `/communities/${encodeURIComponent(args.communityId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_update_community_description',
    title: 'Atualizar descricao da comunidade',
    description:
      'Atualiza a descricao (assunto) de uma comunidade existente. A instancia conectada precisa ser administradora da comunidade. POST /update-community-description',
    inputSchema: {
      communityId: z.string().describe('ID da comunidade (ex.: 120363019502650977@g.us).'),
      communityDescription: z.string().describe('Nova descricao da comunidade.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-community-description', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_create_broadcast',
    title: 'Criar lista de transmissao',
    description:
      'Cria uma lista de transmissao (broadcast) com os contatos informados. Retorna o `broadcastId` no formato "...@broadcast", que pode ser usado como destinatario nas tools de envio de mensagem para disparar a mesma mensagem a todos os contatos da lista de uma vez. POST /broadcast',
    inputSchema: {
      name: z.string().describe('Nome da lista de transmissao.'),
      phones: z
        .array(z.string())
        .describe('Lista de numeros no padrao E.164 sem o sinal de mais, ou seja DDI+DDD+numero (ex.: ["5511999999999"]).'),
    },
    handler: (args) => zapiRequest('POST', '/broadcast', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_broadcast',
    title: 'Atualizar lista de transmissao',
    description:
      'Atualiza uma lista de transmissao existente. ATENCAO: a lista de `phones` enviada SUBSTITUI integralmente a lista atual de contatos — para adicionar ou remover alguem, envie o conjunto completo de numeros que deve permanecer. PUT /broadcast/{broadcastId}',
    inputSchema: {
      broadcastId: z.string().describe('ID da lista de transmissao a atualizar (ex.: 1234567890@broadcast).'),
      phones: z
        .array(z.string())
        .describe('Lista COMPLETA de numeros que a lista devera conter apos a atualizacao (substitui a lista inteira), no formato DDI+DDD+numero.'),
      name: z.string().optional().describe('Opcional. Novo nome da lista de transmissao.'),
    },
    handler: (args) =>
      zapiRequest('PUT', `/broadcast/${encodeURIComponent(args.broadcastId)}`, {
        body: toBody(args, ['broadcastId']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_list_broadcasts',
    title: 'Listar listas de transmissao',
    description:
      'Lista as listas de transmissao (broadcasts) existentes na instancia, com paginacao. Retorna o id "...@broadcast", o nome e os contatos de cada lista. GET /broadcast',
    inputSchema: {
      page: z.number().int().optional().describe('Opcional. Numero da pagina, comecando em 1.'),
      pageSize: z.number().int().optional().describe('Opcional. Quantidade de listas por pagina (padrao 20).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/broadcast', {
        query: { page: args.page, pageSize: args.pageSize },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_delete_broadcast',
    title: 'Excluir lista de transmissao',
    description:
      'Exclui definitivamente uma lista de transmissao. Os contatos nao sao afetados, mas a lista deixa de existir e o `broadcastId` nao podera mais ser usado como destinatario. DELETE /broadcast/{broadcastId}',
    inputSchema: {
      broadcastId: z.string().describe('ID da lista de transmissao a excluir (ex.: 1234567890@broadcast).'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', `/broadcast/${encodeURIComponent(args.broadcastId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),
];
