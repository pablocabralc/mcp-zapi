import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, delayMessage, delayTyping, phone, type ToolDef } from '@/lib/tool';

/** Canais (newsletters), chamadas de voz/SIP e conversa com a Meta AI. */
export const newsletterCallsTools: ToolDef[] = [
  defineTool({
    name: 'zapi_create_newsletter',
    title: 'Criar canal',
    description:
      'Cria um novo canal (newsletter) do WhatsApp. Retorna o ID do canal, sempre com o sufixo "@newsletter". A imagem do canal nao pode ser definida aqui: use zapi_update_newsletter_picture depois de criar. POST /create-newsletter',
    inputSchema: {
      name: z.string().describe('Nome do canal que sera criado.'),
      description: z.string().optional().describe('Opcional. Descricao do canal.'),
    },
    handler: (args) => zapiRequest('POST', '/create-newsletter', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_newsletter_picture',
    title: 'Atualizar imagem do canal',
    description:
      'Define ou troca a imagem de perfil de um canal (newsletter). Aceita uma URL publica ou uma string Base64. POST /update-newsletter-picture',
    inputSchema: {
      id: z.string().describe('ID do canal, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      pictureUrl: z.string().describe('URL publica da imagem ou string Base64 (data:image/...;base64,...).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-newsletter-picture', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_newsletter_name',
    title: 'Atualizar nome do canal',
    description: 'Altera o nome de um canal (newsletter) do qual voce e administrador. POST /update-newsletter-name',
    inputSchema: {
      id: z.string().describe('ID do canal, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      name: z.string().describe('Novo nome do canal.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-newsletter-name', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_newsletter_description',
    title: 'Atualizar descricao do canal',
    description:
      'Altera a descricao de um canal (newsletter) do qual voce e administrador. POST /update-newsletter-description',
    inputSchema: {
      id: z.string().describe('ID do canal, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      description: z.string().describe('Nova descricao do canal.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/update-newsletter-description', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_follow_newsletter',
    title: 'Seguir canal',
    description: 'Passa a seguir (inscrever-se em) um canal (newsletter). PUT /follow-newsletter',
    inputSchema: {
      id: z.string().describe('ID do canal a seguir, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
    },
    handler: (args) => zapiRequest('PUT', '/follow-newsletter', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_unfollow_newsletter',
    title: 'Deixar de seguir canal',
    description: 'Deixa de seguir (cancela a inscricao em) um canal (newsletter). PUT /unfollow-newsletter',
    inputSchema: {
      id: z.string().describe('ID do canal a deixar de seguir, com o sufixo "@newsletter".'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/unfollow-newsletter', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mute_newsletter',
    title: 'Silenciar canal',
    description: 'Silencia as notificacoes de um canal (newsletter) que voce segue. PUT /mute-newsletter',
    inputSchema: {
      id: z.string().describe('ID do canal a silenciar, com o sufixo "@newsletter".'),
    },
    handler: (args) => zapiRequest('PUT', '/mute-newsletter', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_unmute_newsletter',
    title: 'Reativar notificacoes do canal',
    description: 'Remove o silenciamento das notificacoes de um canal (newsletter). PUT /unmute-newsletter',
    inputSchema: {
      id: z.string().describe('ID do canal a reativar as notificacoes, com o sufixo "@newsletter".'),
    },
    handler: (args) => zapiRequest('PUT', '/unmute-newsletter', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_delete_newsletter',
    title: 'Excluir canal',
    description:
      'Exclui definitivamente um canal (newsletter) do qual voce e o dono. Acao irreversivel: o ID vai no corpo da requisicao, nao no path. DELETE /delete-newsletter',
    inputSchema: {
      id: z.string().describe('ID do canal a excluir, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', '/delete-newsletter', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_newsletter_metadata',
    title: 'Metadados do canal',
    description:
      'Consulta os metadados de um canal (newsletter): nome, descricao, imagem, quantidade de inscritos e demais informacoes. Opcionalmente traz tambem a lista de inscritos. GET /newsletter/metadata/{newsletterId}',
    inputSchema: {
      newsletterId: z.string().describe('ID do canal consultado, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      mustGetSubscribers: z
        .boolean()
        .optional()
        .describe('Opcional. Quando true, inclui a lista de inscritos na resposta. Padrao: false.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/newsletter/metadata/${encodeURIComponent(args.newsletterId)}`, {
        query: { mustGetSubscribers: args.mustGetSubscribers },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_get_newsletter_subscribers',
    title: 'Inscritos do canal',
    description:
      'Lista os inscritos (seguidores) de um canal (newsletter) do qual voce e administrador. GET /newsletter/subscribers/{newsletterId}',
    inputSchema: {
      newsletterId: z.string().describe('ID do canal consultado, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/newsletter/subscribers/${encodeURIComponent(args.newsletterId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_list_newsletters',
    title: 'Listar canais',
    description:
      'Lista todos os canais (newsletters) vinculados a instancia: tanto os que voce e dono quanto os que voce segue. GET /newsletter',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/newsletter', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_search_newsletter',
    title: 'Pesquisar canais',
    description:
      'Pesquisa canais (newsletters) publicos do WhatsApp por pais, com filtros de recomendacao e texto livre. POST /search-newsletter',
    inputSchema: {
      limit: z.number().int().describe('Quantidade maxima de canais retornados na busca.'),
      filters: z
        .object({
          countryCodes: z
            .array(z.string())
            .describe('Lista de codigos de pais no padrao ISO (ex.: ["BR", "US"]) usados para filtrar os canais.'),
        })
        .describe('Filtros da busca. Obrigatorio informar countryCodes.'),
      view: z
        .enum(['RECOMMENDED', 'TRENDING', 'POPULAR', 'NEW'])
        .optional()
        .describe(
          'Opcional. Tipo de listagem: RECOMMENDED (recomendados), TRENDING (em alta), POPULAR (populares) ou NEW (novos).',
        ),
      searchText: z.string().optional().describe('Opcional. Texto livre para buscar canais pelo nome.'),
    },
    handler: (args) => zapiRequest('POST', '/search-newsletter', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_newsletter_config',
    title: 'Configurar reacoes do canal',
    description:
      'Atualiza as configuracoes de um canal (newsletter), definindo quais reacoes os inscritos podem enviar. POST /newsletter/settings/{newsletterId}',
    inputSchema: {
      newsletterId: z.string().describe('ID do canal configurado, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      reactionCodes: z
        .enum(['basic', 'all'])
        .describe('Reacoes permitidas: "basic" (apenas o conjunto basico de emojis) ou "all" (todos os emojis).'),
    },
    handler: (args) =>
      zapiRequest('POST', `/newsletter/settings/${encodeURIComponent(args.newsletterId)}`, {
        body: toBody(args, ['newsletterId']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_accept_newsletter_admin_invite',
    title: 'Aceitar convite de admin do canal',
    description:
      'Aceita um convite para se tornar administrador de um canal (newsletter). Nao possui corpo na requisicao. POST /newsletter/accept-admin-invite/{newsletterId}',
    inputSchema: {
      newsletterId: z.string().describe('ID do canal do convite, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
    },
    handler: (args) =>
      zapiRequest('POST', `/newsletter/accept-admin-invite/${encodeURIComponent(args.newsletterId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_remove_newsletter_admin',
    title: 'Remover admin do canal',
    description:
      'Remove um administrador ja ativo de um canal (newsletter). Somente o dono do canal pode executar. POST /newsletter/remove-admin/{newsletterId}',
    inputSchema: {
      newsletterId: z.string().describe('ID do canal, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      phone,
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('POST', `/newsletter/remove-admin/${encodeURIComponent(args.newsletterId)}`, {
        body: toBody(args, ['newsletterId']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_revoke_newsletter_admin_invite',
    title: 'Revogar convite de admin do canal',
    description:
      'Revoga um convite de administrador de canal (newsletter) que ainda nao foi aceito. POST /newsletter/revoke-admin-invite/{newsletterId}',
    inputSchema: {
      newsletterId: z.string().describe('ID do canal, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      phone,
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('POST', `/newsletter/revoke-admin-invite/${encodeURIComponent(args.newsletterId)}`, {
        body: toBody(args, ['newsletterId']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_transfer_newsletter_ownership',
    title: 'Transferir propriedade do canal',
    description:
      'Transfere a propriedade de um canal (newsletter) para outro participante, que precisa ja ser administrador do canal. POST /newsletter/transfer-ownership/{newsletterId}',
    inputSchema: {
      newsletterId: z.string().describe('ID do canal, com o sufixo "@newsletter" (ex.: 120363...@newsletter).'),
      phone: z
        .string()
        .describe(
          'Numero do novo dono no formato DDI+DDD+numero (ex.: 5511999999999). Ele precisa ja ser administrador do canal.',
        ),
      quitAdmin: z
        .boolean()
        .optional()
        .describe('Opcional. Quando true, o dono anterior deixa de ser administrador apos a transferencia.'),
    },
    handler: (args) =>
      zapiRequest('POST', `/newsletter/transfer-ownership/${encodeURIComponent(args.newsletterId)}`, {
        body: toBody(args, ['newsletterId']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_send_call',
    title: 'Realizar chamada',
    description:
      'Inicia uma chamada de voz para um numero pelo WhatsApp. Disponivel apenas para contas com o recurso de chamadas habilitado. POST /send-call',
    inputSchema: {
      phone,
      callDuration: z
        .number()
        .int()
        .optional()
        .describe('Opcional. Duracao da chamada em segundos antes de encerrar automaticamente. Padrao: 5, maximo: 15.'),
      callAudioUrl: z
        .string()
        .optional()
        .describe('Opcional. URL de um audio (bitrate de 16k) reproduzido durante a chamada.'),
    },
    handler: (args) => zapiRequest('POST', '/send-call', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_call_token',
    title: 'Obter token de chamada',
    description:
      'Gera um token efemero de uso unico para autenticar a SDK @z-api/call e realizar chamadas pelo navegador. GET /call-token',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/call-token', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_create_sip_token',
    title: 'Gerar credenciais SIP',
    description:
      'Gera as credenciais SIP da instancia (host, usuario e token) para integrar com softphones e PABX. Atencao: substitui o token SIP existente, invalidando o anterior. Requer o recurso de chamadas contratado. POST /sip-token',
    handler: (args) => zapiRequest('POST', '/sip-token', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_sip_info',
    title: 'Consultar informacoes SIP',
    description:
      'Consulta os dados da configuracao SIP da instancia: host, usuario, token mascarado e se a integracao esta ativa. GET /sip-info',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/sip-info', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_meta_ai_message',
    title: 'Conversar com a Meta AI',
    description:
      'Envia uma mensagem para a Meta AI reutilizando o endpoint de texto do WhatsApp. Use o numero "13135550002" para falar com a Meta AI no chat privado, ou o ID de um grupo mencionando "13135550002" em mentioned para acionar a IA dentro do grupo. Somente mensagens de texto sao suportadas e o recurso funciona apenas em contas pessoais (nao funciona em WhatsApp Business). POST /send-text',
    inputSchema: {
      phone: z
        .string()
        .describe(
          'Use "13135550002" para conversar com a Meta AI no chat privado, ou o ID do grupo (ex.: 120363...@g.us) para aciona-la dentro de um grupo.',
        ),
      message: z.string().describe('Texto da pergunta ou instrucao enviada a Meta AI.'),
      delayMessage,
      delayTyping,
      mentioned: z
        .array(z.string())
        .optional()
        .describe('Opcional. Numeros mencionados na mensagem. Em grupos, inclua "13135550002" para acionar a Meta AI.'),
    },
    handler: (args) => zapiRequest('POST', '/send-text', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),
];
