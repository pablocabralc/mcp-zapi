import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, phone, type ToolDef } from '@/lib/tool';

/** Status / Stories do WhatsApp (publicacoes que expiram em 24h). */
export const statusTools: ToolDef[] = [
  defineTool({
    name: 'zapi_send_text_status',
    title: 'Publicar status de texto',
    description: 'Publica um texto no seu status do WhatsApp (expira em 24h). POST /send-text-status',
    inputSchema: {
      message: z.string().describe('Texto a publicar no status.'),
    },
    handler: (args) => zapiRequest('POST', '/send-text-status', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_image_status',
    title: 'Publicar status de imagem',
    description: 'Publica uma imagem no seu status do WhatsApp. POST /send-image-status',
    inputSchema: {
      image: z.string().describe('URL publica da imagem ou string Base64 (data:image/...;base64,...).'),
      caption: z.string().optional().describe('Opcional. Legenda da imagem.'),
    },
    handler: (args) => zapiRequest('POST', '/send-image-status', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_video_status',
    title: 'Publicar status de video',
    description: 'Publica um video no seu status do WhatsApp (maximo 10MB). POST /send-video-status',
    inputSchema: {
      video: z.string().describe('URL publica do video ou string Base64. Maximo 10MB.'),
      caption: z.string().optional().describe('Opcional. Legenda do video.'),
    },
    handler: (args) => zapiRequest('POST', '/send-video-status', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_reply_status_text',
    title: 'Responder status com texto',
    description: 'Responde com texto ao status publicado por um contato. POST /reply-status-text',
    inputSchema: {
      phone,
      message: z.string().describe('Texto da resposta.'),
      statusMessageId: z.string().describe('ID da mensagem de status sendo respondida.'),
    },
    handler: (args) => zapiRequest('POST', '/reply-status-text', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_reply_status_gif',
    title: 'Responder status com GIF',
    description: 'Responde com um GIF ao status publicado por um contato. POST /reply-status-gif',
    inputSchema: {
      phone,
      gif: z.string().describe('Link de um arquivo MP4 que sera exibido como GIF.'),
      statusMessageId: z.string().describe('ID da mensagem de status sendo respondida.'),
    },
    handler: (args) => zapiRequest('POST', '/reply-status-gif', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_reply_status_sticker',
    title: 'Responder status com sticker',
    description: 'Responde com uma figurinha ao status publicado por um contato. POST /reply-status-sticker',
    inputSchema: {
      phone,
      sticker: z.string().describe('URL publica do sticker ou string Base64.'),
      statusMessageId: z.string().describe('ID da mensagem de status sendo respondida.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/reply-status-sticker', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),
];
