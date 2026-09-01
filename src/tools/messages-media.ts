import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, delayMessage, delayTyping, messageId, phone, type ToolDef } from '@/lib/tool';

/** Campo `messageId` quando ele serve para CITAR/RESPONDER outra mensagem (sempre opcional). */
const quotedMessageId = z
  .string()
  .optional()
  .describe('Opcional. ID da mensagem a ser citada/respondida (o envio aparece como resposta a ela no WhatsApp).');

/** Envio de mensagens e midias: texto, imagem, audio, video, documento, localizacao, contatos, reacoes. */
export const messagesMediaTools: ToolDef[] = [
  defineTool({
    name: 'zapi_send_text',
    title: 'Enviar mensagem de texto',
    description:
      'Envia uma mensagem de texto para um contato ou grupo. E o endpoint mais versatil do WhatsApp: alem do envio simples, ' +
      'permite responder/citar outra mensagem (messageId), mencionar participantes de um grupo (mentioned, mentionAll ou groupMentioned), ' +
      'responder no privado de quem escreveu no grupo (privateAnswer) e ate EDITAR um texto ja enviado (editMessageId). ' +
      'Use esta tool sempre que a mensagem for so texto. POST /send-text',
    inputSchema: {
      phone,
      message: z.string().describe('Conteudo do texto a ser enviado. Aceita emojis e quebras de linha (\\n).'),
      delayMessage,
      delayTyping,
      editMessageId: z
        .string()
        .optional()
        .describe(
          'Opcional. ID de uma mensagem de texto JA ENVIADA por voce que deve ser editada; o campo message vira o novo conteudo dela.',
        ),
      messageId: quotedMessageId,
      mentioned: z
        .array(z.string())
        .optional()
        .describe(
          'Opcional. Lista de telefones (DDI+DDD+numero) a serem mencionados na mensagem. So funciona quando phone e um grupo.',
        ),
      mentionAll: z
        .boolean()
        .optional()
        .describe('Opcional. Se true, menciona TODOS os participantes do grupo (equivalente ao @todos).'),
      groupMentioned: z
        .array(
          z.object({
            phone: z.string().describe('ID do grupo mencionado (ex.: 120363...@g.us).'),
            subject: z.string().describe('Nome/assunto do grupo exibido na mencao.'),
          }),
        )
        .optional()
        .describe('Opcional. Lista de grupos a serem mencionados dentro da mensagem, no formato {phone, subject}.'),
      privateAnswer: z
        .boolean()
        .optional()
        .describe(
          'Opcional. Se true, responde no privado do remetente citando a mensagem dele no grupo (usar junto com messageId).',
        ),
    },
    handler: (args) => zapiRequest('POST', '/send-text', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_image',
    title: 'Enviar imagem',
    description:
      'Envia uma imagem (JPEG, PNG, etc.) com legenda opcional. Aceita URL publica ou Base64. ' +
      'Permite enviar como visualizacao unica (viewOnce) e editar a legenda/imagem de um envio anterior (editImageMessageId). POST /send-image',
    inputSchema: {
      phone,
      image: z
        .string()
        .describe('URL publica da imagem ou string Base64 no formato data:image/png;base64,iVBORw0KGgo...'),
      caption: z.string().optional().describe('Opcional. Legenda exibida junto da imagem.'),
      messageId: quotedMessageId,
      delayMessage,
      viewOnce: z
        .boolean()
        .optional()
        .describe('Opcional. Se true, envia como "visualizacao unica" (a imagem some depois de aberta).'),
      editImageMessageId: z
        .string()
        .optional()
        .describe('Opcional. ID de uma mensagem de imagem ja enviada por voce que deve ser editada.'),
    },
    handler: (args) => zapiRequest('POST', '/send-image', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_sticker',
    title: 'Enviar figurinha (sticker)',
    description:
      'Envia uma figurinha/sticker para um contato ou grupo. Aceita URL publica ou Base64 (idealmente imagem quadrada, PNG/WEBP). POST /send-sticker',
    inputSchema: {
      phone,
      sticker: z.string().describe('URL publica da figurinha ou string Base64. Formatos recomendados: PNG ou WEBP.'),
      messageId: quotedMessageId,
      delayMessage,
      stickerAuthor: z.string().optional().describe('Opcional. Nome do autor exibido nos metadados da figurinha.'),
    },
    handler: (args) => zapiRequest('POST', '/send-sticker', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_gif',
    title: 'Enviar GIF',
    description:
      'Envia um GIF animado. No WhatsApp o GIF e na verdade um video MP4 curto sem audio, entao informe a URL ou Base64 de um MP4. POST /send-gif',
    inputSchema: {
      phone,
      gif: z.string().describe('URL publica de um arquivo MP4 (exibido como GIF) ou string Base64 equivalente.'),
      caption: z.string().optional().describe('Opcional. Legenda exibida junto do GIF.'),
      messageId: quotedMessageId,
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-gif', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_audio',
    title: 'Enviar audio / mensagem de voz',
    description:
      'Envia um audio que aparece como mensagem de voz (PTT) no WhatsApp. Aceita URL publica ou Base64 (MP3, OGG, etc.). ' +
      'Use async=true para arquivos grandes (a conversao ocorre em segundo plano) e waveform para exibir as ondas sonoras. POST /send-audio',
    inputSchema: {
      phone,
      audio: z.string().describe('URL publica do arquivo de audio ou string Base64 (ex.: data:audio/mp3;base64,...).'),
      delayMessage,
      delayTyping,
      viewOnce: z.boolean().optional().describe('Opcional. Se true, envia o audio como "visualizacao unica".'),
      async: z
        .boolean()
        .optional()
        .describe('Opcional. Se true, a resposta retorna antes da conversao terminar (recomendado para audios grandes).'),
      waveform: z
        .boolean()
        .optional()
        .describe('Opcional. Se true, exibe o desenho das ondas sonoras no player do WhatsApp.'),
    },
    handler: (args) => zapiRequest('POST', '/send-audio', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_video',
    title: 'Enviar video',
    description:
      'Envia um video com legenda opcional. Aceita URL publica ou Base64 (MP4 recomendado). ' +
      'Suporta visualizacao unica (viewOnce), envio assincrono (async) e edicao de um video ja enviado (editVideoMessageId). POST /send-video',
    inputSchema: {
      phone,
      video: z.string().describe('URL publica do video ou string Base64 (ex.: data:video/mp4;base64,...).'),
      caption: z.string().optional().describe('Opcional. Legenda exibida junto do video.'),
      messageId: quotedMessageId,
      delayMessage,
      viewOnce: z.boolean().optional().describe('Opcional. Se true, envia como "visualizacao unica".'),
      async: z
        .boolean()
        .optional()
        .describe('Opcional. Se true, a resposta retorna antes do upload/conversao terminar (util para videos grandes).'),
      editVideoMessageId: z
        .string()
        .optional()
        .describe('Opcional. ID de uma mensagem de video ja enviada por voce que deve ser editada.'),
    },
    handler: (args) => zapiRequest('POST', '/send-video', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_ptv',
    title: 'Enviar video instantaneo (PTV)',
    description:
      'Envia um video circular/instantaneo (PTV — "picture in the video"), aquele videozinho redondo gravado pela camera do WhatsApp. ' +
      'Ideal para videos curtos e verticais. POST /send-ptv',
    inputSchema: {
      phone,
      ptv: z.string().describe('URL publica do video ou string Base64. Recomenda-se MP4 curto e quadrado/vertical.'),
      messageId: quotedMessageId,
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-ptv', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_document',
    title: 'Enviar documento',
    description:
      'Envia um arquivo/documento (PDF, DOCX, XLSX, ZIP, etc.). A extensao do arquivo faz parte do path da requisicao e deve ser informada ' +
      'no campo extension. Aceita URL publica ou Base64 no campo document. POST /send-document/{extension}',
    inputSchema: {
      phone,
      extension: z
        .string()
        .describe('Extensao do arquivo, sem ponto, usada no path (ex.: pdf, docx, xlsx, csv, zip, txt).'),
      document: z.string().describe('URL publica do arquivo ou string Base64 (ex.: data:application/pdf;base64,...).'),
      fileName: z
        .string()
        .optional()
        .describe('Opcional. Nome do arquivo exibido no WhatsApp (ex.: contrato.pdf). Sem ele, a Z-API gera um nome.'),
      caption: z.string().optional().describe('Opcional. Legenda exibida junto do documento.'),
      messageId: quotedMessageId,
      delayMessage,
      editDocumentMessageId: z
        .string()
        .optional()
        .describe('Opcional. ID de uma mensagem de documento ja enviada por voce que deve ser editada.'),
    },
    handler: (args) =>
      zapiRequest('POST', `/send-document/${encodeURIComponent(args.extension)}`, {
        body: toBody(args, ['extension']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_send_link',
    title: 'Enviar link com preview',
    description:
      'Envia uma mensagem de texto com um cartao de pre-visualizacao do link (titulo, descricao e imagem personalizados), ' +
      'sem depender do scraping automatico do WhatsApp. IMPORTANTE: o campo message deve terminar com a mesma URL informada em linkUrl. POST /send-link',
    inputSchema: {
      phone,
      message: z
        .string()
        .describe('Texto da mensagem. Deve conter a URL do campo linkUrl ao FINAL do texto para o preview ser montado.'),
      image: z.string().describe('URL publica da imagem exibida na miniatura do preview.'),
      linkUrl: z.string().describe('URL de destino do link (deve ser a mesma que aparece no final de message).'),
      title: z.string().describe('Titulo exibido no cartao de preview.'),
      linkDescription: z.string().describe('Descricao exibida abaixo do titulo no cartao de preview.'),
      linkType: z
        .enum(['SMALL', 'MEDIUM', 'LARGE'])
        .optional()
        .describe('Opcional. Tamanho da miniatura do preview: SMALL (padrao), MEDIUM ou LARGE.'),
      messageId: quotedMessageId,
      delayMessage,
      delayTyping,
    },
    handler: (args) => zapiRequest('POST', '/send-link', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_location',
    title: 'Enviar localizacao',
    description:
      'Envia um ponto de localizacao no mapa, com titulo e endereco exibidos no cartao. As coordenadas devem ser enviadas como string. POST /send-location',
    inputSchema: {
      phone,
      title: z.string().describe('Titulo/nome do local (ex.: Escritorio Central).'),
      address: z.string().describe('Endereco completo exibido abaixo do titulo.'),
      latitude: z.string().describe('Latitude do ponto, como string (ex.: "-23.5505199").'),
      longitude: z.string().describe('Longitude do ponto, como string (ex.: "-46.6333094").'),
      messageId: quotedMessageId,
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-location', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_contact',
    title: 'Enviar um contato',
    description:
      'Envia um unico cartao de contato (vCard) para um chat. Use quando precisar compartilhar o numero de uma pessoa ou empresa. ' +
      'Para enviar varios contatos de uma vez, use zapi_send_contacts. POST /send-contact',
    inputSchema: {
      phone,
      contactName: z.string().describe('Nome do contato como sera exibido no cartao.'),
      contactPhone: z.string().describe('Numero do contato no formato DDI+DDD+numero (ex.: 5511999999999).'),
      contactBusinessDescription: z
        .string()
        .optional()
        .describe('Opcional. Descricao comercial do contato (aparece em contatos empresariais).'),
      messageId: quotedMessageId,
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-contact', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_contacts',
    title: 'Enviar varios contatos',
    description:
      'Envia varios cartoes de contato de uma unica vez, cada um podendo ter multiplos telefones. ' +
      'Para um unico contato simples, prefira zapi_send_contact. POST /send-contacts',
    inputSchema: {
      phone,
      contacts: z
        .array(
          z.object({
            name: z.string().describe('Nome do contato exibido no cartao.'),
            phones: z
              .array(z.string())
              .describe('Lista de telefones do contato no formato DDI+DDD+numero (ex.: ["5511999999999"]).'),
            businessDescription: z.string().optional().describe('Opcional. Descricao comercial do contato.'),
          }),
        )
        .describe('Lista de contatos a enviar, cada item com name, phones e opcionalmente businessDescription.'),
      messageId: quotedMessageId,
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-contacts', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_product',
    title: 'Enviar produto do catalogo',
    description:
      'Envia um produto especifico de um catalogo do WhatsApp Business para um chat. Necessario informar o telefone dono do catalogo e o ID do produto. POST /send-product',
    inputSchema: {
      phone,
      catalogPhone: z
        .string()
        .describe('Telefone (DDI+DDD+numero) da conta WhatsApp Business dona do catalogo onde o produto esta.'),
      productId: z.string().describe('ID do produto dentro do catalogo.'),
    },
    handler: (args) => zapiRequest('POST', '/send-product', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_catalog',
    title: 'Enviar catalogo',
    description:
      'Envia o catalogo completo de uma conta WhatsApp Business para um chat, com titulo, mensagem e descricao personalizaveis. POST /send-catalog',
    inputSchema: {
      phone,
      catalogPhone: z.string().describe('Telefone (DDI+DDD+numero) da conta WhatsApp Business dona do catalogo.'),
      translation: z
        .enum(['EN', 'PT'])
        .optional()
        .describe('Opcional. Idioma dos textos padrao do cartao de catalogo: EN (ingles) ou PT (portugues).'),
      message: z.string().optional().describe('Opcional. Texto enviado junto do cartao do catalogo.'),
      title: z.string().optional().describe('Opcional. Titulo exibido no cartao do catalogo.'),
      catalogDescription: z.string().optional().describe('Opcional. Descricao exibida no cartao do catalogo.'),
    },
    handler: (args) => zapiRequest('POST', '/send-catalog', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_forward_message',
    title: 'Encaminhar mensagem',
    description:
      'Encaminha uma mensagem existente para outro chat. Informe o destino em phone, o ID da mensagem em messageId e o chat de ORIGEM em messagePhone. POST /forward-message',
    inputSchema: {
      phone,
      messageId,
      messagePhone: z
        .string()
        .describe('Telefone ou ID do grupo do chat de ORIGEM, onde a mensagem a ser encaminhada esta.'),
      delayMessage,
    },
    handler: (args) =>
      zapiRequest('POST', '/forward-message', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_reaction',
    title: 'Reagir a uma mensagem',
    description:
      'Adiciona uma reacao (emoji) a uma mensagem de um chat, igual ao pressionar e segurar a mensagem no WhatsApp. POST /send-reaction',
    inputSchema: {
      phone,
      reaction: z.string().describe('Emoji da reacao (ex.: "❤️", "👍", "😂"). Um unico emoji por reacao.'),
      messageId,
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-reaction', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_reaction',
    title: 'Remover reacao de uma mensagem',
    description: 'Remove a reacao (emoji) que voce adicionou anteriormente a uma mensagem. POST /send-remove-reaction',
    inputSchema: {
      phone,
      messageId,
      delayMessage,
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('POST', '/send-remove-reaction', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_delete_message',
    title: 'Apagar mensagem',
    description:
      'Apaga uma mensagem do chat. Todos os parametros vao na query string. Use owner=true quando a mensagem foi enviada por voce ' +
      '(apaga para todos) e deleteForMe=true para apagar somente do seu aparelho. Acao irreversivel. DELETE /messages',
    inputSchema: {
      messageId,
      phone,
      owner: z
        .boolean()
        .describe('true se a mensagem foi enviada por VOCE (permite apagar para todos); false se foi recebida.'),
      deleteForMe: z
        .boolean()
        .optional()
        .describe('Opcional. Se true, apaga a mensagem apenas para voce, mantendo-a para o outro participante.'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', '/messages', {
        query: {
          messageId: args.messageId,
          phone: args.phone,
          owner: args.owner,
          deleteForMe: args.deleteForMe,
        },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_read_message',
    title: 'Marcar mensagem como lida',
    description:
      'Marca uma mensagem recebida como lida (exibe o "visto"/tique azul para o remetente). POST /read-message',
    inputSchema: {
      phone,
      messageId,
    },
    handler: (args) => zapiRequest('POST', '/read-message', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),
];
