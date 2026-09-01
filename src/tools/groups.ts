import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, delayMessage, type ToolDef } from '@/lib/tool';

/** Campo reutilizado: identificador do grupo no formato do WhatsApp. */
const groupId = z
  .string()
  .describe('ID do grupo no WhatsApp (ex.: 120363019502650977-1616170657 ou 120363019502650977@g.us).');

/** Campo reutilizado: lista de telefones participantes. */
const phones = z
  .array(z.string())
  .describe('Lista de telefones no formato DDI+DDD+numero, sem mascara (ex.: ["5511999999999", "5511888888888"]).');

/** Grupos do WhatsApp: criacao, administracao, participantes, convites e mencoes. */
export const groupTools: ToolDef[] = [
  defineTool({
    name: 'zapi_get_groups',
    title: 'Listar grupos',
    description:
      'Lista de forma paginada todos os grupos dos quais a instancia conectada participa, retornando ID, nome e dados basicos de cada grupo. Util para descobrir o groupId necessario nas demais tools de grupo. GET /groups',
    inputSchema: {
      page: z.number().int().describe('Numero da pagina a consultar, comecando em 1.'),
      pageSize: z.number().int().describe('Quantidade de grupos retornados por pagina (ex.: 10, 20, 100).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/groups', {
        query: { page: args.page, pageSize: args.pageSize },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_create_group',
    title: 'Criar grupo',
    description:
      'Cria um novo grupo no WhatsApp com o nome informado e adiciona os participantes da lista. A instancia conectada se torna administradora do grupo. Retorna o ID do grupo criado e, quando aplicavel, o link de convite. POST /create-group',
    inputSchema: {
      autoInvite: z
        .boolean()
        .describe(
          'Se true, participantes cuja privacidade impede adicao direta recebem automaticamente um convite por mensagem privada; se false, esses contatos simplesmente nao entram no grupo.',
        ),
      groupName: z.string().describe('Nome (assunto) do grupo que sera criado.'),
      phones,
    },
    handler: (args) => zapiRequest('POST', '/create-group', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_group_name',
    title: 'Alterar nome do grupo',
    description:
      'Altera o nome (assunto) de um grupo existente. A instancia conectada precisa ser administradora do grupo, ou o grupo precisa permitir que qualquer participante edite as configuracoes. POST /update-group-name',
    inputSchema: {
      groupId,
      groupName: z.string().describe('Novo nome (assunto) que sera atribuido ao grupo.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-group-name', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_group_photo',
    title: 'Alterar foto do grupo',
    description:
      'Atualiza a imagem de perfil (foto) de um grupo. Aceita uma URL publica da imagem ou uma string Base64. A instancia conectada precisa ter permissao de administradora para alterar a foto. POST /update-group-photo',
    inputSchema: {
      groupId,
      groupPhoto: z
        .string()
        .describe('URL publica da imagem ou string Base64 (data:image/jpeg;base64,...) da nova foto do grupo.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-group-photo', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_group_description',
    title: 'Alterar descricao do grupo',
    description:
      'Atualiza o texto de descricao de um grupo, exibido para os participantes na tela de informacoes do grupo. Requer permissao de administrador quando o grupo restringe a edicao das configuracoes. POST /update-group-description',
    inputSchema: {
      groupId,
      groupDescription: z.string().describe('Novo texto de descricao do grupo.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-group-description', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_group_settings',
    title: 'Alterar configuracoes do grupo',
    description:
      'Altera as permissoes e restricoes de um grupo: quem pode enviar mensagens, quem pode editar as configuracoes, se novos membros precisam de aprovacao e quem pode adicionar participantes. Atencao: neste endpoint o identificador do grupo vai no campo `phone` (e nao em `groupId`). POST /update-group-settings',
    inputSchema: {
      phone: z
        .string()
        .describe('ID do grupo (ex.: 120363019502650977-1616170657). Neste endpoint o campo se chama `phone`.'),
      adminOnlyMessage: z
        .boolean()
        .describe('Se true, somente administradores podem enviar mensagens no grupo; se false, todos podem enviar.'),
      adminOnlySettings: z
        .boolean()
        .describe(
          'Se true, somente administradores podem editar nome, foto e descricao do grupo; se false, qualquer participante pode.',
        ),
      requireAdminApproval: z
        .boolean()
        .describe('Se true, novas entradas pelo link de convite ficam pendentes de aprovacao de um administrador.'),
      adminOnlyAddMember: z
        .boolean()
        .describe('Se true, somente administradores podem adicionar novos participantes ao grupo.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-group-settings', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_add_group_participant',
    title: 'Adicionar participantes ao grupo',
    description:
      'Adiciona um ou mais telefones como participantes de um grupo existente. A instancia conectada precisa ser administradora (ou o grupo permitir adicao por qualquer membro). POST /add-participant',
    inputSchema: {
      autoInvite: z
        .boolean()
        .describe(
          'Se true, contatos que bloqueiam adicao direta por configuracao de privacidade recebem um convite por mensagem privada em vez de serem adicionados.',
        ),
      groupId,
      phones,
    },
    handler: (args) => zapiRequest('POST', '/add-participant', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_group_participant',
    title: 'Remover participantes do grupo',
    description:
      'Remove (expulsa) um ou mais participantes de um grupo. Acao irreversivel: os removidos so voltam se forem adicionados novamente ou entrarem pelo link de convite. Requer permissao de administrador. POST /remove-participant',
    inputSchema: {
      groupId,
      phones,
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('POST', '/remove-participant', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_approve_group_participant',
    title: 'Aprovar entrada no grupo',
    description:
      'Aprova solicitacoes de entrada pendentes em um grupo que exige aprovacao de administrador (requireAdminApproval ativado). Os telefones aprovados passam a ser participantes do grupo. POST /approve-participant',
    inputSchema: {
      groupId,
      phones,
    },
    handler: (args) =>
      zapiRequest('POST', '/approve-participant', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_reject_group_participant',
    title: 'Rejeitar entrada no grupo',
    description:
      'Rejeita solicitacoes de entrada pendentes em um grupo que exige aprovacao de administrador. Os telefones rejeitados nao entram no grupo. POST /reject-participant',
    inputSchema: {
      groupId,
      phones,
    },
    handler: (args) =>
      zapiRequest('POST', '/reject-participant', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_add_group_admin',
    title: 'Promover participantes a administradores',
    description:
      'Promove um ou mais participantes ja pertencentes ao grupo ao cargo de administrador, dando a eles permissao para gerenciar membros e configuracoes. POST /add-admin',
    inputSchema: {
      groupId,
      phones,
    },
    handler: (args) => zapiRequest('POST', '/add-admin', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_group_admin',
    title: 'Rebaixar administradores do grupo',
    description:
      'Remove o cargo de administrador de um ou mais participantes, que continuam no grupo porem como membros comuns. POST /remove-admin',
    inputSchema: {
      groupId,
      phones,
    },
    handler: (args) => zapiRequest('POST', '/remove-admin', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_leave_group',
    title: 'Sair do grupo',
    description:
      'Faz a instancia conectada sair do grupo informado. Para voltar sera necessario um novo convite ou o link do grupo. POST /leave-group',
    inputSchema: {
      groupId,
    },
    annotations: { destructiveHint: true },
    handler: (args) => zapiRequest('POST', '/leave-group', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_group_metadata',
    title: 'Obter metadados completos do grupo',
    description:
      'Retorna os metadados completos de um grupo: nome, descricao, dono, data de criacao, configuracoes, lista completa de participantes com indicacao de quem e administrador e tambem o link de convite. Por incluir o link, e um pouco mais lento que a versao "light". GET /group-metadata/{phone}',
    inputSchema: {
      phone: z.string().describe('ID do grupo a consultar (ex.: 120363019502650977-1616170657).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/group-metadata/${encodeURIComponent(args.phone)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_light_group_metadata',
    title: 'Obter metadados leves do grupo',
    description:
      'Retorna os metadados de um grupo sem o link de convite, o que torna a consulta mais rapida que a versao completa. Traz nome, descricao, configuracoes e a lista de participantes. GET /light-group-metadata/{phone}',
    inputSchema: {
      phone: z.string().describe('ID do grupo a consultar (ex.: 120363019502650977-1616170657).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/light-group-metadata/${encodeURIComponent(args.phone)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_get_group_invitation_metadata',
    title: 'Obter metadados por link de convite',
    description:
      'Consulta os dados de um grupo a partir do seu link de convite, sem precisar entrar nele. Util para inspecionar nome, descricao, dono e quantidade de participantes antes de aceitar o convite. GET /group-invitation-metadata',
    inputSchema: {
      url: z.string().describe('Link de convite do grupo (ex.: https://chat.whatsapp.com/XXXXXXXXXXXXXXXX).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/group-invitation-metadata', {
        query: { url: args.url },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_get_group_invitation_link',
    title: 'Obter link de convite do grupo',
    description:
      'Retorna o link de convite atual de um grupo, que pode ser compartilhado para que novas pessoas entrem. A instancia conectada precisa ser administradora do grupo. GET /group-invitation-link/{groupId}',
    inputSchema: {
      groupId,
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/group-invitation-link/${encodeURIComponent(args.groupId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_redefine_group_invitation_link',
    title: 'Redefinir link de convite do grupo',
    description:
      'Revoga o link de convite atual do grupo e gera um novo. Quem tiver o link antigo deixa de conseguir entrar. Nao possui corpo na requisicao: o grupo vai apenas no path. Requer permissao de administrador. POST /redefine-invitation-link/{groupId}',
    inputSchema: {
      groupId,
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('POST', `/redefine-invitation-link/${encodeURIComponent(args.groupId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_accept_group_invite',
    title: 'Aceitar convite de grupo',
    description:
      'Faz a instancia conectada entrar em um grupo usando um link de convite. Atencao: apesar do nome, o path da Z-API tem a ordem invertida (accept-invite-group). GET /accept-invite-group',
    inputSchema: {
      url: z.string().describe('Link de convite do grupo a ser aceito (ex.: https://chat.whatsapp.com/XXXXXXXXXXXXXXXX).'),
    },
    handler: (args) =>
      zapiRequest('GET', '/accept-invite-group', { query: { url: args.url }, instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mention_group_participants',
    title: 'Mencionar participantes do grupo',
    description:
      'Envia uma mensagem de texto em um grupo mencionando participantes especificos, que recebem notificacao da mencao. Reutiliza o endpoint de envio de texto, variando apenas os atributos do corpo: alem de `phone` e `message`, envia `mentioned` com os telefones citados. O texto da mensagem deve conter @numero para cada telefone mencionado (ex.: "Bom dia @5511999999999"). POST /send-text',
    inputSchema: {
      phone: z.string().describe('ID do grupo onde a mensagem sera enviada (ex.: 120363019502650977-1616170657).'),
      message: z
        .string()
        .describe('Texto da mensagem; deve conter @numero para cada telefone listado em `mentioned` (ex.: "Ola @5511999999999").'),
      mentioned: z
        .array(z.string())
        .describe('Telefones que serao mencionados, no formato DDI+DDD+numero (ex.: ["5511999999999"]).'),
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-text', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mention_all_group',
    title: 'Mencionar todos do grupo',
    description:
      'Envia uma mensagem de texto em um grupo mencionando todos os participantes de uma vez (equivalente ao @todos). Reutiliza o endpoint de envio de texto, variando apenas os atributos do corpo: acrescenta `mentionAll` ao lado de `phone` e `message`. POST /send-text',
    inputSchema: {
      phone: z.string().describe('ID do grupo onde a mensagem sera enviada (ex.: 120363019502650977-1616170657).'),
      message: z.string().describe('Texto da mensagem que sera enviada mencionando todos os participantes.'),
      mentionAll: z.boolean().describe('Defina como true para mencionar todos os participantes do grupo.'),
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-text', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mention_linked_groups',
    title: 'Mencionar grupos vinculados',
    description:
      'Envia uma mensagem de texto mencionando outros grupos vinculados a uma mesma comunidade, criando atalhos clicaveis para eles. Reutiliza o endpoint de envio de texto, variando apenas os atributos do corpo: acrescenta `groupMentioned` ao lado de `phone` e `message`. POST /send-text',
    inputSchema: {
      phone: z.string().describe('ID do grupo ou da comunidade onde a mensagem sera enviada.'),
      message: z.string().describe('Texto da mensagem que acompanhara as mencoes aos grupos.'),
      groupMentioned: z
        .array(
          z.object({
            phone: z.string().describe('ID do grupo mencionado (ex.: 120363019502650977-1616170657).'),
            subject: z.string().describe('Nome (assunto) do grupo mencionado, exibido no texto da mensagem.'),
          }),
        )
        .describe('Lista dos grupos da comunidade que serao mencionados, cada um com `phone` (ID) e `subject` (nome).'),
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-text', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),
];
