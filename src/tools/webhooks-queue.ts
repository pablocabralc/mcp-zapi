import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, type ToolDef } from '@/lib/tool';

/** Campo `value` compartilhado por todos os endpoints de configuracao de webhook. */
const webhookValue = z
  .string()
  .describe(
    'URL HTTPS que recebera o POST da Z-API com o payload do evento. Deve ser publicamente acessivel e responder rapidamente. Envie uma string vazia ("") para desativar este webhook.',
  );

/** Configuracao de webhooks (callbacks) e gerenciamento da fila de mensagens. */
export const webhooksQueueTools: ToolDef[] = [
  defineTool({
    name: 'zapi_set_webhook_received',
    title: 'Configurar webhook ao receber mensagem',
    description:
      'Define a URL do webhook "ao receber mensagem" (ReceivedCallback): a Z-API envia um POST para essa URL sempre que a instância recebe uma mensagem nova (texto, imagem, áudio, documento, etc.). PUT /update-webhook-received',
    inputSchema: {
      value: webhookValue,
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-webhook-received', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_webhook_delivery',
    title: 'Configurar webhook ao enviar mensagem',
    description:
      'Define a URL do webhook "ao enviar mensagem" (DeliveryCallback): a Z-API notifica essa URL a cada mensagem enviada pela instância, incluindo as enviadas diretamente pelo aparelho celular. PUT /update-webhook-delivery',
    inputSchema: {
      value: webhookValue,
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-webhook-delivery', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_webhook_disconnected',
    title: 'Configurar webhook de desconexão',
    description:
      'Define a URL do webhook de desconexão (DisconnectedCallback): a Z-API avisa essa URL quando a instância perde a conexão com o WhatsApp, permitindo alertar a equipe e solicitar a releitura do QR Code. PUT /update-webhook-disconnected',
    inputSchema: {
      value: webhookValue,
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-webhook-disconnected', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_webhook_message_status',
    title: 'Configurar webhook de status da mensagem',
    description:
      'Define a URL do webhook de status da mensagem (MessageStatusCallback): a Z-API notifica cada mudança de status das mensagens — SENT (enviada), RECEIVED (entregue no aparelho), READ (lida) e PLAYED (áudio ouvido). PUT /update-webhook-message-status',
    inputSchema: {
      value: webhookValue,
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-webhook-message-status', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_webhook_chat_presence',
    title: 'Configurar webhook de presença do chat',
    description:
      'Define a URL do webhook de presença/status do chat (PresenceChatCallback): a Z-API informa quando um contato fica online ou offline e quando está "digitando..." ou "gravando áudio...". PUT /update-webhook-chat-presence',
    inputSchema: {
      value: webhookValue,
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-webhook-chat-presence', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_webhook_connected',
    title: 'Configurar webhook de conexão',
    description:
      'Define a URL do webhook de conexão da instância (ConnectedCallback): a Z-API avisa essa URL sempre que a instância se conecta ou reconecta ao WhatsApp. PUT /update-webhook-connected',
    inputSchema: {
      value: webhookValue,
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-webhook-connected', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_all_webhooks',
    title: 'Configurar todos os webhooks de uma vez',
    description:
      'Aponta TODOS os webhooks da instância (ao receber, ao enviar, status da mensagem, conexão, desconexão e presença do chat) para a mesma URL em uma única chamada. Cada notificação chega com um campo indicando qual callback a originou. PUT /update-every-webhooks',
    inputSchema: {
      value: webhookValue,
      notifySentByMe: z
        .boolean()
        .optional()
        .describe(
          'Opcional. Quando true, o webhook "ao receber" também passa a receber as mensagens enviadas por você (pelo celular ou pela própria API).',
        ),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-every-webhooks', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_notify_sent_by_me',
    title: 'Notificar mensagens enviadas por mim',
    description:
      'Habilita ou desabilita o recebimento, no webhook "ao receber mensagem", das mensagens enviadas por você mesmo (pelo aparelho celular ou pela API). Útil para manter no seu sistema o histórico completo das duas pontas da conversa. PUT /update-notify-sent-by-me',
    inputSchema: {
      notifySentByMe: z
        .boolean()
        .describe(
          'true para também receber no webhook as mensagens enviadas por você; false para receber apenas as mensagens de terceiros.',
        ),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-notify-sent-by-me', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_webhook_filters',
    title: 'Configurar filtros dos webhooks',
    description:
      'Define quais mensagens e quais tipos de callback serão entregues aos webhooks da instância, reduzindo o tráfego enviado ao seu servidor. Enviar arrays vazios remove os filtros já configurados. PUT /update-filters',
    inputSchema: {
      messageFilters: z
        .array(
          z.enum([
            'FILTER_FROM_GROUP',
            'FILTER_FROM_PRIVATE_CHAT',
            'FILTER_TEXT_MESSAGE',
            'FILTER_IMAGE_MESSAGE',
            'FILTER_VIDEO_MESSAGE',
            'FILTER_AUDIO_MESSAGE',
            'FILTER_DOCUMENT_MESSAGE',
          ]),
        )
        .optional()
        .describe(
          'Opcional. Filtros de mensagem — afetam SOMENTE o webhook "ao receber" (ReceivedCallback). Cada item filtra o tipo correspondente: FILTER_FROM_GROUP (mensagens vindas de grupos), FILTER_FROM_PRIVATE_CHAT (conversas privadas), FILTER_TEXT_MESSAGE (texto), FILTER_IMAGE_MESSAGE (imagem), FILTER_VIDEO_MESSAGE (vídeo), FILTER_AUDIO_MESSAGE (áudio) e FILTER_DOCUMENT_MESSAGE (documento).',
        ),
      callbackTypeFilters: z
        .array(
          z.enum([
            'FILTER_RECEIVED_CALLBACK',
            'FILTER_DELIVERY_CALLBACK',
            'FILTER_CONNECTED_CALLBACK',
            'FILTER_DISCONNECTED_CALLBACK',
            'FILTER_PRESENCE_CHAT_CALLBACK',
            'FILTER_MESSAGE_STATUS_CALLBACK',
          ]),
        )
        .optional()
        .describe(
          'Opcional. Filtros por tipo de callback, aplicados a todos os webhooks: FILTER_RECEIVED_CALLBACK (ao receber), FILTER_DELIVERY_CALLBACK (ao enviar), FILTER_CONNECTED_CALLBACK (conexão), FILTER_DISCONNECTED_CALLBACK (desconexão), FILTER_PRESENCE_CHAT_CALLBACK (presença do chat) e FILTER_MESSAGE_STATUS_CALLBACK (status da mensagem).',
        ),
    },
    handler: (args) => zapiRequest('PUT', '/update-filters', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_queue',
    title: 'Listar fila de mensagens',
    description:
      'Lista as mensagens que estão aguardando na fila de envio da instância (mensagens enfileiradas enquanto o WhatsApp esteve desconectado ou indisponível). Retorna "messages", o cursor "pagingState" e o indicador "hasMore". Versão recomendada pela Z-API — prefira esta à versão GET depreciada. POST /queue',
    inputSchema: {
      pageSize: z
        .number()
        .int()
        .optional()
        .describe('Opcional. Quantidade de mensagens por página. Padrão 20, máximo 30.'),
      pagingState: z
        .string()
        .optional()
        .describe(
          'Opcional. Cursor da próxima página, retornado no campo "pagingState" da chamada anterior. Omita na primeira página.',
        ),
    },
    handler: (args) => zapiRequest('POST', '/queue', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_queue_legacy',
    title: 'Listar fila de mensagens (depreciado)',
    description:
      'Lista as mensagens aguardando na fila usando a paginação antiga por número de página. ATENÇÃO: este endpoint foi DEPRECIADO pela Z-API — use a versão POST (tool zapi_get_queue), que é a recomendada e pagina por cursor (pagingState). GET /queue',
    inputSchema: {
      page: z.number().int().describe('Número da página a consultar.'),
      pageSize: z.number().int().describe('Quantidade de mensagens retornadas por página.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/queue', {
        query: { page: args.page, pageSize: args.pageSize },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_clear_queue',
    title: 'Limpar fila de mensagens',
    description:
      'Apaga TODAS as mensagens que estão aguardando na fila de envio da instância. Ação irreversível: as mensagens descartadas não serão entregues. DELETE /queue',
    annotations: { destructiveHint: true },
    handler: (args) => zapiRequest('DELETE', '/queue', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_delete_queue_message',
    title: 'Remover mensagem da fila',
    description:
      'Remove da fila de envio uma única mensagem, identificada pelo seu zaapId. A mensagem removida não será entregue. DELETE /queue/{zaapId}',
    inputSchema: {
      zaapId: z
        .string()
        .describe('Identificador zaapId da mensagem na fila (retornado na listagem da fila ou na resposta do envio).'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', `/queue/${encodeURIComponent(args.zaapId)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_queue_settings',
    title: 'Configurar enfileiramento da fila',
    description:
      'Define se as mensagens devem ou não ser enfileiradas quando a instância está desconectada do WhatsApp. Com o bloqueio ativo, as tentativas de envio com a instância offline retornam erro imediatamente em vez de ficarem acumuladas na fila. PUT /update-queue-settings',
    inputSchema: {
      disableEnqueueWhenDisconnected: z
        .boolean()
        .describe(
          'true para BLOQUEAR o enfileiramento enquanto a instância estiver desconectada; false para continuar enfileirando normalmente.',
        ),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-queue-settings', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),
];
