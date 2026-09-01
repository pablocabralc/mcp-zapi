import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, delayMessage, messageId, phone, type ToolDef } from '@/lib/tool';

// Campos reutilizados pelos varios formatos interativos deste grupo.
const buttonActionType = z
  .enum(['CALL', 'URL', 'REPLY'])
  .describe('Tipo do botao: CALL (liga para um numero), URL (abre um link) ou REPLY (envia uma resposta rapida).');

const carouselButton = z.object({
  id: z.string().optional().describe('Opcional. Identificador do botao, devolvido no webhook quando o contato clica.'),
  label: z.string().describe('Texto exibido no botao (curto, cabe em poucos caracteres).'),
  type: buttonActionType,
  url: z.string().optional().describe('Obrigatorio quando type=URL. Link aberto ao clicar no botao.'),
  phone: z.string().optional().describe('Obrigatorio quando type=CALL. Numero discado ao clicar (DDI+DDD+numero).'),
});

const simpleButton = z.object({
  label: z.string().describe('Texto exibido no botao.'),
  id: z.string().optional().describe('Opcional. Identificador do botao, devolvido no webhook quando o contato clica.'),
});

const orderProduct = z.object({
  name: z.string().describe('Nome do produto exibido no pedido.'),
  value: z.number().describe('Valor unitario do produto (ex.: 19.9).'),
  quantity: z.number().int().describe('Quantidade deste produto no pedido.'),
  productId: z.string().optional().describe('Opcional. ID do produto no catalogo do WhatsApp Business.'),
});

const orderObject = z.object({
  currency: z.string().describe('Moeda do pedido no padrao ISO (ex.: BRL, USD).'),
  products: z.array(orderProduct).describe('Lista de produtos que compoem o pedido.'),
  discount: z.number().optional().describe('Opcional. Valor de desconto aplicado ao total.'),
  tax: z.number().optional().describe('Opcional. Valor de impostos somado ao total.'),
  shipping: z.number().optional().describe('Opcional. Valor do frete somado ao total.'),
});

const orderStatus = z
  .enum(['pending', 'processing', 'shipped', 'completed', 'canceled'])
  .describe('Situacao do pedido: pending, processing, shipped, completed ou canceled.');

const paymentStatus = z.enum(['pending', 'paid']).describe('Situacao do pagamento: pending (pendente) ou paid (pago).');

const eventObject = z.object({
  name: z.string().describe('Nome/titulo do evento.'),
  dateTime: z.string().describe('Data e hora de inicio no formato ISO 8601 (ex.: 2024-04-29T09:30:53.309Z).'),
  description: z.string().optional().describe('Opcional. Descricao/detalhes do evento.'),
  timeZone: z.string().optional().describe('Opcional. Fuso horario do evento (ex.: UTC-3).'),
  location: z
    .object({ name: z.string().describe('Nome do local onde o evento acontece.') })
    .optional()
    .describe('Opcional. Local presencial do evento.'),
  callLinkType: z
    .enum(['voice', 'video'])
    .optional()
    .describe('Opcional. Cria um link de chamada do WhatsApp: voice (voz) ou video.'),
  canceled: z.boolean().optional().describe('Opcional. Marque true para sinalizar que o evento foi cancelado.'),
});

/** Mensagens interativas: botoes, listas, carrossel, enquetes, pedidos e eventos. */
export const messagesInteractiveTools: ToolDef[] = [
  defineTool({
    name: 'zapi_send_button_actions',
    title: 'Enviar botoes de acao',
    description:
      'Envia uma mensagem com botoes de acao que podem ligar para um numero (CALL), abrir um link (URL) ou responder ' +
      'automaticamente (REPLY). Use quando quiser oferecer atalhos de acao imediata, como "Falar com atendente", ' +
      '"Ver catalogo" ou "Confirmar". POST /send-button-actions',
    inputSchema: {
      phone,
      message: z.string().describe('Texto principal da mensagem exibido acima dos botoes.'),
      buttonActions: z
        .array(carouselButton)
        .describe('Lista de botoes de acao. Cada botao precisa de label e type; URL exige url e CALL exige phone.'),
      title: z.string().optional().describe('Opcional. Titulo em destaque exibido no topo da mensagem.'),
      footer: z.string().optional().describe('Opcional. Rodape exibido em texto menor abaixo da mensagem.'),
      image: z.string().optional().describe('Opcional. URL publica ou Base64 de uma imagem exibida junto da mensagem.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/send-button-actions', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_button_list',
    title: 'Enviar botoes de resposta rapida',
    description:
      'Envia uma mensagem de texto com uma lista de botoes de resposta rapida. Use para perguntas objetivas com poucas ' +
      'alternativas (ex.: "Sim" / "Nao" / "Falar com atendente"). O campo message nao pode ser vazio. ' +
      'POST /send-button-list',
    inputSchema: {
      phone,
      message: z.string().min(1).describe('Texto da mensagem exibido acima dos botoes. Nao pode ser vazio.'),
      buttonList: z
        .object({ buttons: z.array(simpleButton).describe('Lista de botoes de resposta rapida exibidos ao contato.') })
        .describe('Objeto que agrupa os botoes da mensagem.'),
      delayMessage,
    },
    handler: (args) =>
      zapiRequest('POST', '/send-button-list', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_button_list_image',
    title: 'Enviar botoes com imagem',
    description:
      'Envia uma mensagem com imagem no topo e botoes de resposta rapida logo abaixo. Use o mesmo endpoint da lista de ' +
      'botoes, mudando apenas o corpo: buttonList passa a conter image. Ideal para divulgar um produto ou promocao com ' +
      'chamadas de acao. POST /send-button-list',
    inputSchema: {
      phone,
      message: z.string().describe('Texto da mensagem exibido junto da imagem e dos botoes.'),
      buttonList: z
        .object({
          image: z.string().describe('URL publica da imagem exibida acima dos botoes.'),
          buttons: z.array(simpleButton).describe('Lista de botoes de resposta rapida exibidos ao contato.'),
        })
        .describe('Objeto que agrupa a imagem e os botoes da mensagem.'),
      delayMessage,
    },
    handler: (args) =>
      zapiRequest('POST', '/send-button-list', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_button_list_video',
    title: 'Enviar botoes com video',
    description:
      'Envia uma mensagem com video no topo e botoes de resposta rapida logo abaixo. Usa o mesmo endpoint da lista de ' +
      'botoes, mudando apenas o corpo: buttonList passa a conter video. Util para demonstracoes curtas seguidas de uma ' +
      'chamada de acao. POST /send-button-list',
    inputSchema: {
      phone,
      message: z.string().describe('Texto da mensagem exibido junto do video e dos botoes.'),
      buttonList: z
        .object({
          video: z.string().describe('URL publica do video ou string Base64, exibido acima dos botoes.'),
          buttons: z.array(simpleButton).describe('Lista de botoes de resposta rapida exibidos ao contato.'),
        })
        .describe('Objeto que agrupa o video e os botoes da mensagem.'),
      delayMessage,
    },
    handler: (args) =>
      zapiRequest('POST', '/send-button-list', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_option_list',
    title: 'Enviar lista de opcoes (menu)',
    description:
      'Envia uma mensagem com um menu de opcoes que abre em uma lista suspensa ao tocar no botao. Use quando houver ' +
      'muitas alternativas (mais do que caberia em botoes), como um menu de atendimento ou catalogo de servicos. ' +
      'Atencao: este formato nao funciona mais em grupos. POST /send-option-list',
    inputSchema: {
      phone,
      message: z.string().describe('Texto da mensagem exibido acima do botao que abre a lista.'),
      optionList: z
        .object({
          title: z.string().describe('Titulo exibido no topo da lista quando ela e aberta.'),
          buttonLabel: z.string().describe('Texto do botao que abre a lista de opcoes (ex.: "Ver opcoes").'),
          options: z
            .array(
              z.object({
                title: z.string().describe('Titulo da opcao exibido na lista.'),
                description: z.string().optional().describe('Opcional. Descricao complementar exibida sob o titulo.'),
                id: z
                  .string()
                  .optional()
                  .describe('Opcional. Identificador da opcao, devolvido no webhook quando ela e escolhida.'),
              }),
            )
            .describe('Itens selecionaveis da lista.'),
        })
        .describe('Objeto que descreve o menu de opcoes.'),
      delayMessage,
    },
    handler: (args) =>
      zapiRequest('POST', '/send-option-list', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_button_otp',
    title: 'Enviar botao de copiar codigo (OTP)',
    description:
      'Envia uma mensagem com um botao que copia um codigo para a area de transferencia do contato. Use para enviar ' +
      'codigos de verificacao (OTP), cupons de desconto ou qualquer valor que o contato precise colar em outro lugar. ' +
      'POST /send-button-otp',
    inputSchema: {
      phone,
      message: z.string().describe('Texto da mensagem exibido acima do botao.'),
      code: z.string().describe('Valor copiado para a area de transferencia quando o contato clica no botao.'),
      image: z.string().optional().describe('Opcional. URL publica ou Base64 de uma imagem exibida na mensagem.'),
      buttonText: z.string().optional().describe('Opcional. Texto do botao. Padrao: "Copiar codigo".'),
    },
    handler: (args) =>
      zapiRequest('POST', '/send-button-otp', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_button_pix',
    title: 'Enviar botao de chave Pix',
    description:
      'Envia uma mensagem com um botao que permite ao contato copiar sua chave Pix diretamente pelo WhatsApp. Use para ' +
      'facilitar cobrancas e recebimentos sem exigir que o cliente digite a chave. POST /send-button-pix',
    inputSchema: {
      phone,
      pixKey: z.string().describe('Chave Pix que sera copiada pelo contato.'),
      type: z
        .enum(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'EVP'])
        .describe('Tipo da chave Pix: CPF, CNPJ, PHONE, EMAIL ou EVP (chave aleatoria).'),
      merchantName: z.string().optional().describe('Opcional. Nome do recebedor exibido na mensagem. Padrao: "Pix".'),
    },
    handler: (args) =>
      zapiRequest('POST', '/send-button-pix', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_carousel',
    title: 'Enviar carrossel de cards',
    description:
      'Envia um carrossel horizontal de cards, cada um com imagem, texto e botoes proprios. Use para apresentar varios ' +
      'produtos, planos ou imoveis em uma unica mensagem navegavel. POST /send-carousel',
    inputSchema: {
      phone,
      message: z.string().describe('Texto principal exibido acima do carrossel.'),
      carousel: z
        .array(
          z.object({
            text: z.string().describe('Texto/descricao exibido no card.'),
            image: z.string().describe('URL publica da imagem do card.'),
            buttons: z
              .array(carouselButton)
              .optional()
              .describe('Opcional. Botoes exibidos neste card (CALL, URL ou REPLY).'),
          }),
        )
        .describe('Lista de cards do carrossel, na ordem em que serao exibidos.'),
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-carousel', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_poll',
    title: 'Enviar enquete',
    description:
      'Cria e envia uma enquete (votacao) em um grupo do WhatsApp. Use para coletar preferencias do grupo, como escolher ' +
      'data de reuniao ou tema de conteudo. POST /send-poll',
    inputSchema: {
      phone: z.string().describe('ID do grupo onde a enquete sera publicada (ex.: 120363...@g.us).'),
      message: z.string().describe('Pergunta da enquete exibida no topo.'),
      poll: z
        .array(z.object({ name: z.string().describe('Texto de uma das alternativas da enquete.') }))
        .describe('Lista de alternativas de voto da enquete.'),
      pollMaxOptions: z
        .number()
        .int()
        .optional()
        .describe('Opcional. Quantidade maxima de alternativas que cada participante pode marcar.'),
      delayMessage,
    },
    handler: (args) => zapiRequest('POST', '/send-poll', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_poll_vote',
    title: 'Votar em enquete',
    description:
      'Registra o voto da sua instancia em uma enquete ja publicada em um grupo. Envie todas as alternativas escolhidas ' +
      'de uma vez; enviar uma lista vazia remove o voto. POST /send-poll-vote',
    inputSchema: {
      phone: z.string().describe('ID do grupo onde a enquete foi publicada (ex.: 120363...@g.us).'),
      pollMessageId: z.string().describe('ID da mensagem da enquete em que se deseja votar.'),
      pollVote: z
        .array(z.object({ name: z.string().describe('Texto exato da alternativa escolhida.') }))
        .describe('Alternativas votadas. O texto precisa ser identico ao cadastrado na enquete.'),
    },
    handler: (args) => zapiRequest('POST', '/send-poll-vote', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_order',
    title: 'Enviar pedido',
    description:
      'Envia um pedido (order) com lista de produtos, valores e opcoes de pagamento (Pix e/ou cartao). Use para fechar ' +
      'uma venda dentro da conversa, apresentando o resumo do carrinho ao cliente. POST /send-order',
    inputSchema: {
      phone,
      order: orderObject.describe('Dados do pedido: moeda, produtos e valores opcionais de desconto, imposto e frete.'),
      paymentSettings: z
        .object({
          pix: z
            .object({
              key: z.string().optional().describe('Chave Pix usada para receber o pagamento.'),
              keyType: z
                .enum(['cpf', 'cnpj', 'phone', 'email', 'randomKey'])
                .optional()
                .describe('Tipo da chave Pix: cpf, cnpj, phone, email ou randomKey.'),
              name: z.string().optional().describe('Nome do recebedor do Pix exibido ao cliente.'),
            })
            .optional()
            .describe('Opcional. Habilita pagamento via Pix no pedido.'),
          card: z
            .object({ enabled: z.boolean().optional().describe('Defina true para habilitar pagamento com cartao.') })
            .optional()
            .describe('Opcional. Habilita pagamento com cartao no pedido.'),
        })
        .optional()
        .describe('Opcional. Formas de pagamento oferecidas junto ao pedido.'),
    },
    handler: (args) => zapiRequest('POST', '/send-order', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_order_status_update',
    title: 'Atualizar status do pedido',
    description:
      'Atualiza a situacao de um pedido ja enviado (ex.: de pending para shipped ou completed). Reenvie sempre o objeto ' +
      'order completo, pois ele substitui os dados anteriores. POST /order-status-update',
    inputSchema: {
      phone,
      messageId,
      referenceId: z.string().describe('Referencia do pedido (referenceId) devolvida no envio ou no webhook.'),
      orderRequestId: z.string().describe('ID da requisicao do pedido (orderRequestId) devolvido pela Z-API.'),
      orderStatus,
      paymentStatus,
      order: orderObject.describe('Dados completos e atualizados do pedido (moeda, produtos e valores).'),
      message: z.string().optional().describe('Opcional. Mensagem enviada ao cliente junto da atualizacao.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/order-status-update', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_order_payment_update',
    title: 'Atualizar pagamento do pedido',
    description:
      'Atualiza a situacao de pagamento de um pedido (ex.: marcar como paid apos a confirmacao). Disponivel apenas para ' +
      'contas WhatsApp Business. Reenvie o objeto order completo. POST /order-payment-update',
    inputSchema: {
      phone,
      messageId,
      referenceId: z.string().describe('Referencia do pedido (referenceId) devolvida no envio ou no webhook.'),
      orderRequestId: z.string().describe('ID da requisicao do pedido (orderRequestId) devolvido pela Z-API.'),
      orderStatus,
      paymentStatus,
      order: orderObject.describe('Dados completos e atualizados do pedido (moeda, produtos e valores).'),
      message: z.string().optional().describe('Opcional. Mensagem enviada ao cliente junto da atualizacao.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/order-payment-update', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_pin_message',
    title: 'Fixar ou desafixar mensagem',
    description:
      'Fixa (pin) ou desafixa (unpin) uma mensagem no topo da conversa ou do grupo. Use para destacar avisos e regras. ' +
      'A duracao e ignorada quando a acao for unpin. POST /pin-message',
    inputSchema: {
      phone,
      messageId,
      messageAction: z.enum(['pin', 'unpin']).describe('Acao desejada: pin (fixar) ou unpin (desafixar).'),
      pinMessageDuration: z
        .enum(['24_hours', '7_days', '30_days'])
        .describe('Tempo que a mensagem permanece fixada: 24_hours, 7_days ou 30_days. Ignorado quando action=unpin.'),
    },
    handler: (args) => zapiRequest('POST', '/pin-message', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_newsletter_admin_invite',
    title: 'Convidar administrador de newsletter',
    description:
      'Envia a um contato o convite para se tornar administrador de um canal (newsletter) do WhatsApp. ' +
      'POST /send-newsletter-admin-invite',
    inputSchema: {
      phone,
      adminInviteMessage: z
        .object({
          newsletterId: z.string().describe('ID do canal/newsletter (ex.: 120363...@newsletter).'),
          caption: z.string().describe('Texto do convite exibido ao contato.'),
        })
        .describe('Dados do convite de administracao do canal.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/send-newsletter-admin-invite', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_event',
    title: 'Enviar evento',
    description:
      'Cria e envia um evento de agenda em um grupo do WhatsApp, com data, local e opcao de link de chamada. Use para ' +
      'marcar reunioes e encontros com confirmacao de presenca dos participantes. POST /send-event',
    inputSchema: {
      phone: z.string().describe('ID do grupo onde o evento sera criado (ex.: 120363...@g.us).'),
      event: eventObject.describe('Dados do evento: nome, data/hora ISO, descricao, fuso, local e tipo de chamada.'),
    },
    handler: (args) => zapiRequest('POST', '/send-event', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_edit_event',
    title: 'Editar evento',
    description:
      'Edita um evento ja publicado (mudar data, local, descricao ou marcar como cancelado). Todos os dados atuais do ' +
      'evento devem ser reenviados, pois o objeto event substitui integralmente o anterior. POST /send-edit-event',
    inputSchema: {
      phone,
      eventMessageId: z.string().describe('ID da mensagem do evento que sera editado.'),
      event: eventObject.describe('Dados completos e atualizados do evento. Reenvie TODOS os campos ja existentes.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/send-edit-event', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_event_response',
    title: 'Responder convite de evento',
    description:
      'Confirma ou recusa a presenca da sua instancia em um evento publicado no WhatsApp. POST /send-event-response',
    inputSchema: {
      phone,
      eventMessageId: z.string().describe('ID da mensagem do evento que esta sendo respondido.'),
      eventResponse: z
        .enum(['GOING', 'NOT_GOING'])
        .describe('Resposta ao convite: GOING (vou participar) ou NOT_GOING (nao vou participar).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/send-event-response', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_reply_button',
    title: 'Simular clique em botao de lista',
    description:
      'Simula o clique em um botao de uma mensagem de lista de opcoes recebida, respondendo como se o proprio usuario ' +
      'tivesse selecionado a opcao. POST /reply-button',
    inputSchema: {
      phone,
      responseButtonId: z.string().describe('ID do botao/opcao que se deseja "clicar" (vindo da mensagem original).'),
      messageId,
    },
    handler: (args) => zapiRequest('POST', '/reply-button', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_reply_template_button',
    title: 'Simular clique em botao REPLY',
    description:
      'Simula o clique em um botao do tipo REPLY de uma mensagem de template/botoes recebida, respondendo como se o ' +
      'usuario tivesse tocado no botao. POST /reply-template-button',
    inputSchema: {
      phone,
      responseTemplateButtonId: z.string().describe('ID do botao REPLY que se deseja "clicar" (da mensagem original).'),
      messageId,
    },
    handler: (args) =>
      zapiRequest('POST', '/reply-template-button', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),
];
