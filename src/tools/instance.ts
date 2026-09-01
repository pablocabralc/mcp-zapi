import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, type ToolDef } from '@/lib/tool';

/** Instancia: conexao (QRCode/telefone), dados do aparelho, perfil do WhatsApp e configuracoes da instancia. */
export const instanceTools: ToolDef[] = [
  defineTool({
    name: 'zapi_get_status',
    title: 'Status da instancia',
    description:
      'Verifica se a instancia esta conectada a uma conta de WhatsApp. Retorna `connected` (numero conectado a Z-API), `smartphoneConnected` (celular com internet) e `error` com o detalhe do status (ex.: "You are already connected", "You need to restore the session", "You are not connected"). Use antes de qualquer envio para confirmar que a instancia esta operacional. GET /status',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/status', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_qr_code',
    title: 'QRCode em bytes/base64',
    description:
      'Retorna o QRCode de conexao em `value` como data URI base64 (data:image/png;base64,...) para renderizar em um componente compativel. O WhatsApp invalida o QRCode a cada ~20 segundos, entao repita a chamada em intervalos de 10 a 20 segundos enquanto a instancia nao conectar. Em aparelhos que exigem Chave de Acesso, no lugar do QRCode vem um objeto `challenge` (WebAuthn) que deve ser concluido com zapi_passkey_prologue. GET /qr-code',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/qr-code', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_qr_code_image',
    title: 'QRCode em imagem',
    description:
      'Retorna o QRCode de conexao em formato de imagem base64, pronto para ser exibido em uma tag de imagem. Assim como no endpoint de bytes, em aparelhos que exigem Chave de Acesso pode ser retornado um objeto `challenge` (WebAuthn) a ser concluido com zapi_passkey_prologue. GET /qr-code/image',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/qr-code/image', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_phone_code',
    title: 'Codigo de pareamento por telefone',
    description:
      'Alternativa ao QRCode: gera o codigo de pareamento ("Conectar com numero de telefone") para o numero informado. O codigo vem em `value` (ex.: "A1B2C3D4E5") e deve ser digitado no WhatsApp do aparelho. Em aparelhos que exigem Chave de Acesso pode ser retornado um objeto `challenge` a ser concluido com zapi_passkey_prologue. GET /phone-code/{phone}',
    inputSchema: {
      phone: z
        .string()
        .describe('Obrigatorio. Numero de telefone a conectar, com DDI+DDD+numero (ex.: 5511999999999). Vai no path.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/phone-code/${encodeURIComponent(args.phone)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_restart_instance',
    title: 'Reiniciar instancia',
    description:
      'Reinicia a instancia na Z-API, funcionando como o botao de reiniciar do sistema operacional — util para resolver travamentos e falhas temporarias de sessao. Nao e necessario ler o QRCode novamente apos o reinicio. Retorna `{ "value": true }`. GET /restart',
    handler: (args) => zapiRequest('GET', '/restart', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_disconnect_instance',
    title: 'Desconectar WhatsApp da instancia',
    description:
      'Desconecta o numero de WhatsApp da instancia Z-API. ATENCAO: apos desconectar, todos os demais metodos da API ficam indisponiveis e os webhooks param de ser enviados; para voltar a operar e preciso ler o QRCode (zapi_get_qr_code) ou usar o codigo por telefone. Retorna `{ "value": true }`. GET /disconnect',
    annotations: { destructiveHint: true },
    handler: (args) => zapiRequest('GET', '/disconnect', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_device',
    title: 'Dados do aparelho conectado',
    description:
      'Retorna informacoes do device/celular conectado a instancia: `phone` (numero), `name` (nome do dono), `imgUrl` (foto de perfil), `about` (recado), `device` (sessionName e device_model), `originalDevice` ("iphone", "android", "smbi" ou "smba"), `sessionId` e `isBusiness` (se e conta comercial). GET /device',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/device', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_me',
    title: 'Dados e configuracoes da instancia',
    description:
      'Retorna os dados e as configuracoes da instancia: `id`, `token`, `name`, `due` (vencimento em unix timestamp), `connected`, `paymentStatus`, `created`, todas as URLs de webhook (connected, delivery, disconnected, messageStatus, presenceChat, received, initialData), `receiveCallbackSentByMe`, `callRejectAuto`, `callRejectMessage`, `autoReadMessage`, `proxyUrl` e `useProxy`. GET /me',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/me', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_my_profile_picture',
    title: 'Foto de perfil da propria conta',
    description:
      'Retorna a foto de perfil do WhatsApp da propria conta conectada a instancia (a URL da imagem). Para consultar a foto de um contato use a tool especifica de contatos. GET /profile-picture',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/profile-picture', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_profile_picture',
    title: 'Alterar foto de perfil',
    description:
      'Altera a imagem de perfil do WhatsApp conectado a instancia. Envia o campo `value` no corpo com a URL publica da imagem. Retorna `{ "value": true }` em caso de sucesso. PUT /profile-picture',
    inputSchema: {
      value: z.string().describe('Obrigatorio. URL publica da imagem que sera usada como nova foto de perfil.'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/profile-picture', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_profile_name',
    title: 'Alterar nome do perfil',
    description:
      'Altera o nome do perfil do WhatsApp conectado a instancia (o nome que os contatos veem). Envia o campo `value` no corpo com o novo nome. Nao confunda com zapi_rename_instance, que renomeia a instancia no painel Z-API. Retorna `{ "value": true }`. PUT /profile-name',
    inputSchema: {
      value: z.string().describe('Obrigatorio. Novo nome do perfil do WhatsApp.'),
    },
    handler: (args) => zapiRequest('PUT', '/profile-name', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_profile_description',
    title: 'Alterar recado/descricao do perfil',
    description:
      'Altera a descricao (recado / "about") do perfil do WhatsApp conectado a instancia. Envia o campo `value` no corpo com o novo texto. Retorna `{ "value": true }`. PUT /profile-description',
    inputSchema: {
      value: z.string().describe('Obrigatorio. Nova descricao/recado do perfil do WhatsApp.'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/profile-description', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_rename_instance',
    title: 'Renomear instancia no painel Z-API',
    description:
      'Renomeia a INSTANCIA no painel da Z-API (nome administrativo usado para identificar a instancia). NAO altera o nome do perfil do WhatsApp — para isso use zapi_update_profile_name. Envia o campo `value` no corpo com o novo nome. Retorna `{ "value": true }`. PUT /update-name',
    inputSchema: {
      value: z.string().describe('Obrigatorio. Novo nome da instancia no painel Z-API.'),
    },
    handler: (args) => zapiRequest('PUT', '/update-name', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_auto_read_message',
    title: 'Leitura automatica de mensagens',
    description:
      'Ativa ou desativa a leitura automatica de todas as mensagens recebidas pela instancia (marca como lidas / risinho azul). Envia o campo booleano `value` no corpo. Retorna `{ "value": true }`. PUT /update-auto-read-message',
    inputSchema: {
      value: z
        .boolean()
        .describe('Obrigatorio. `true` para ativar a leitura automatica das mensagens recebidas, `false` para desativar.'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-auto-read-message', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_auto_read_status',
    title: 'Visualizacao automatica de status',
    description:
      'Ativa ou desativa a visualizacao automatica de todas as publicacoes de status (stories) recebidas pela instancia. Importante: so funciona se a leitura automatica de mensagens estiver habilitada (zapi_update_auto_read_message). Envia o campo booleano `value` no corpo. Retorna `{ "value": true }`. PUT /update-auto-read-status',
    inputSchema: {
      value: z
        .boolean()
        .describe('Obrigatorio. `true` para ativar a visualizacao automatica dos status recebidos, `false` para desativar.'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-auto-read-status', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_call_reject_auto',
    title: 'Rejeicao automatica de chamadas',
    description:
      'Ativa ou desativa a rejeicao automatica de chamadas de voz recebidas no numero conectado a instancia. Com a opcao ativa, toda ligacao recebida e rejeitada automaticamente. Envia o campo booleano `value` no corpo. Retorna `{ "value": true }`. PUT /update-call-reject-auto',
    inputSchema: {
      value: z
        .boolean()
        .describe('Obrigatorio. `true` para rejeitar automaticamente as chamadas recebidas, `false` para desativar.'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-call-reject-auto', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_update_call_reject_message',
    title: 'Mensagem enviada ao rejeitar chamada',
    description:
      'Define o texto que sera enviado ao contato logo apos uma chamada de voz ser rejeitada automaticamente. Para a mensagem realmente ser enviada, a rejeicao automatica (zapi_update_call_reject_auto) precisa estar ativa. Envia o campo `value` no corpo. Retorna `{ "value": true }`. PUT /update-call-reject-message',
    inputSchema: {
      value: z
        .string()
        .describe('Obrigatorio. Texto da mensagem de resposta enviada apos rejeitar uma chamada (ex.: "Nao atendemos ligacoes por aqui").'),
    },
    handler: (args) =>
      zapiRequest('PUT', '/update-call-reject-message', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_extension_token',
    title: 'Token da extensao',
    description:
      'Gera o token de acesso que deve ser inserido na extensao Z-API (usada no fluxo de Chave de Acesso/passkey do WhatsApp). Retorna `token` (ex.: "FA48-HS63") e `expiresAt` (unix timestamp em milissegundos). O token vale no maximo 5 minutos; depois disso e preciso gerar um novo. GET /extension-token',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/extension-token', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_passkey_prologue',
    title: 'Concluir challenge de passkey',
    description:
      'Conclui o fluxo de Chave de Acesso (passkey/WebAuthn) quando o QRCode ou o codigo por telefone retorna um objeto `challenge` no lugar da conexao. Envia a assercao gerada pelo autenticador. Retorna `{ "success": true }` ou `{ "success": false, "reason": "..." }`. POST /passkey-prologue',
    inputSchema: {
      id: z.string().describe('Obrigatorio. Identificador da credencial gerada pelo autenticador.'),
      rawId: z.string().describe('Obrigatorio. Identificador bruto (rawId) da credencial, em base64url.'),
      type: z.string().describe('Obrigatorio. Tipo da credencial. Sempre "public-key".'),
      response: z
        .object({
          authenticatorData: z.string().describe('Obrigatorio. Dados do autenticador em base64.'),
          clientDataJSON: z.string().describe('Obrigatorio. Dados do cliente (clientDataJSON) em base64.'),
          signature: z.string().describe('Obrigatorio. Assinatura gerada pelo autenticador, em base64.'),
          userHandle: z.string().nullable().optional().describe('Opcional. Identificador do usuario (userHandle); pode ser nulo.'),
        })
        .describe('Obrigatorio. Objeto de resposta da assercao WebAuthn retornada pelo autenticador.'),
      clientExtensionResults: z
        .object({
          uvm: z.array(z.any()).optional().describe('Opcional. Metodos de verificacao de usuario (User Verification Methods).'),
        })
        .optional()
        .describe('Opcional. Resultados das extensoes do cliente WebAuthn.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/passkey-prologue', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_reset_passkey_challenge',
    title: 'Resetar challenge de passkey',
    description:
      'Reseta o desafio (challenge) de Chave de Acesso vigente e reinicia a instancia, permitindo gerar um novo QRCode. Nao possui parametros. Apos o sucesso, chame zapi_get_qr_code (ou zapi_get_qr_code_image) para obter o novo QRCode. Retorna `{ "success": true }`. POST /reset-passkey-challenge',
    handler: (args) => zapiRequest('POST', '/reset-passkey-challenge', { instanceAlias: args.instanceAlias }),
  }),
];
