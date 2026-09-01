import { z } from 'zod';
import { partnerRequest, toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, type ToolDef } from '@/lib/tool';

/**
 * API de Parceiro / Integrador da Z-API.
 * Estes endpoints usam o header `Partner-Token` (variavel de ambiente ZAPI_PARTNER_TOKEN)
 * e so estao disponiveis para contas com plano de parceiro/integrador.
 */
export const partnerTools: ToolDef[] = [
  defineTool({
    name: 'zapi_partner_create_instance',
    title: 'Criar instancia (parceiro)',
    description:
      'Cria uma nova instância sob demanda na sua conta de parceiro/integrador, já com nome, webhooks e preferências de comportamento. ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. ' +
      'O parâmetro instanceAlias é ignorado nesta tool, pois a chamada usa o token de parceiro e não credenciais de instância. POST /instances/integrator/on-demand',
    inputSchema: {
      name: z.string().describe('Nome da instância que será criada (identificação no painel da Z-API).'),
      sessionName: z.string().optional().describe('Opcional. Nome da sessão exibido nos dispositivos conectados.'),
      deliveryCallbackUrl: z.string().optional().describe('Opcional. URL do webhook "ao enviar" (mensagens enviadas por você).'),
      receivedCallbackUrl: z.string().optional().describe('Opcional. URL do webhook "ao receber" (mensagens recebidas).'),
      receivedAndDeliveryCallbackUrl: z
        .string()
        .optional()
        .describe('Opcional. URL do webhook único para mensagens recebidas e enviadas por mim.'),
      presenceChatCallbackUrl: z.string().optional().describe('Opcional. URL do webhook de status do chat (digitando/gravando).'),
      disconnectedCallbackUrl: z.string().optional().describe('Opcional. URL do webhook de desconexão da instância.'),
      connectedCallbackUrl: z.string().optional().describe('Opcional. URL do webhook de conexão da instância.'),
      messageStatusCallbackUrl: z.string().optional().describe('Opcional. URL do webhook de status da mensagem (enviada/recebida/lida).'),
      callRejectAuto: z.boolean().optional().describe('Opcional. Rejeitar chamadas automaticamente (true/false).'),
      callRejectMessage: z.string().optional().describe('Opcional. Mensagem enviada automaticamente ao rejeitar uma chamada.'),
      autoReadMessage: z.boolean().optional().describe('Opcional. Marcar mensagens recebidas como lidas automaticamente.'),
      autoReadStatus: z.boolean().optional().describe('Opcional. Marcar status/stories recebidos como lidos automaticamente.'),
      isDevice: z.boolean().optional().describe('Opcional. true para instância mobile (dispositivo) ou false para instância web.'),
      businessDevice: z.boolean().optional().describe('Opcional. Indica se a conexão usará a versão WhatsApp Business.'),
      disableEnqueueWhenDisconnected: z
        .boolean()
        .optional()
        .describe('Opcional. true desabilita a fila de mensagens enquanto a instância estiver desconectada.'),
      profileName: z.string().optional().describe('Opcional. Nome do perfil do WhatsApp (apenas para instâncias mobile).'),
      profilePictureUrl: z
        .string()
        .optional()
        .describe('Opcional. URL da foto de perfil do WhatsApp (apenas para instâncias mobile).'),
    },
    handler: (args) => partnerRequest('POST', '/instances/integrator/on-demand', { body: toBody(args) }),
  }),

  defineTool({
    name: 'zapi_partner_list_instances',
    title: 'Listar instancias (parceiro)',
    description:
      'Lista, de forma paginada, todas as instâncias vinculadas à sua conta de parceiro/integrador, com filtro opcional por nome/ID e por tipo (web ou mobile). ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. ' +
      'O parâmetro instanceAlias é ignorado nesta tool, pois a chamada usa o token de parceiro e não credenciais de instância. GET /instances',
    inputSchema: {
      page: z.number().int().min(1).describe('Página que deseja buscar (começa em 1).'),
      pageSize: z.number().int().min(1).describe('Quantidade de instâncias retornadas por página (ex.: 15).'),
      query: z.string().optional().describe('Opcional. Busca pelo nome ou pelo ID da instância.'),
      middleware: z.enum(['web', 'mobile']).optional().describe('Opcional. Filtra pelo tipo da instância: "web" ou "mobile".'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      partnerRequest('GET', '/instances', {
        query: { page: args.page, pageSize: args.pageSize, query: args.query, middleware: args.middleware },
      }),
  }),

  defineTool({
    name: 'zapi_partner_update_instance',
    title: 'Atualizar assinatura da instancia (parceiro)',
    description:
      'Atualiza a assinatura de uma instância do integrador para habilitar o recurso de chamadas (upgrade). ' +
      'Atenção: só é permitido enviar withCalls como true — não existe downgrade por esta rota; para remover chamadas é necessário cancelar e assinar novamente. ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. PUT /integrator/subscription/update',
    inputSchema: {
      withCalls: z.boolean().describe('Deve ser enviado como true para habilitar chamadas na assinatura da instância.'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/integrator/subscription/update', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_partner_unsubscribe_instance',
    title: 'Cancelar assinatura da instancia (parceiro)',
    description:
      'Cancela a assinatura sob demanda de uma instância do integrador. A instância continua ativa até o fim do mês vigente e depois é desativada automaticamente. ' +
      'Operação destrutiva: use com cautela. Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. ' +
      'POST /integrator/on-demand/cancel',
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('POST', '/integrator/on-demand/cancel', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_partner_sign_instance',
    title: 'Assinar instancia (parceiro)',
    description:
      'Assina (contrata) uma instância sob demanda do integrador, reativando a cobrança e podendo já incluir o recurso de chamadas. ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. ' +
      'POST /integrator/on-demand/subscription',
    inputSchema: {
      withCalls: z.boolean().optional().describe('Opcional. Define se a assinatura será criada com suporte a chamadas (true/false).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/integrator/on-demand/subscription', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_partner_configure_proxy',
    title: 'Configurar proxy da instancia (parceiro)',
    description:
      'Configura (ou desabilita) o proxy pelo qual a instância se conecta ao WhatsApp, informando a URL do proxy e se ele deve ficar ativo. ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. PUT /integrator/configure-proxy',
    inputSchema: {
      proxyUrl: z
        .string()
        .describe('URL do proxy usado pela instância, incluindo credenciais quando houver (ex.: socks5://usuario:senha@host:1080).'),
      enable: z.boolean().describe('Define se o proxy configurado deve ser habilitado (true) ou desabilitado (false).'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/integrator/configure-proxy', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_partner_update_proxy_webhook',
    title: 'Definir webhook de falha do proxy (parceiro)',
    description:
      'Define a URL do webhook que receberá os callbacks de falha do proxy configurado na instância. ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. PUT /update-proxy-webhook',
    inputSchema: {
      value: z.string().describe('URL do webhook que receberá os callbacks de falha do proxy. Envie vazio para remover.'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-proxy-webhook', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_partner_get_extension_token',
    title: 'Gerar token da extensao (parceiro)',
    description:
      'Gera o código de pareamento (formato XXXX-XXXX) usado pela extensão de conexão da Z-API, retornando também o timestamp de expiração em milissegundos. ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. GET /extension-token',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/extension-token', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_partner_get_sdk_connector_token',
    title: 'Gerar token do SDK de conexao (parceiro)',
    description:
      'Gera o token de sessão do SDK de conexão da Z-API, usado no frontend em ZAPIConnector.open({ token }) para abrir o modal de conexão (QR Code, telefone ou migração). ' +
      'Exige a variável de ambiente ZAPI_PARTNER_TOKEN configurada e só funciona para contas com plano de parceiro/integrador na Z-API. GET /sdk-connector-token',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/sdk-connector-token', { instanceAlias: args.instanceAlias }),
  }),
];
