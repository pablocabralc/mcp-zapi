import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, type ToolDef } from '@/lib/tool';

// Campos reutilizados pelos endpoints de registro mobile.
const ddi = z.string().describe('Codigo do pais sem o sinal de "+" (ex.: "55" para Brasil).');

const mobilePhone = z
  .string()
  .describe('Numero de telefone com DDD e SEM o DDI, apenas digitos e sem formatacao (ex.: 4499999999).');

/**
 * Mobile (registro/recuperacao do numero direto pela Z-API) e Security
 * (email de recuperacao e PIN de duas etapas da conta WhatsApp).
 * Estes endpoints so funcionam em instancias do tipo "mobile".
 */
export const mobileSecurityTools: ToolDef[] = [
  defineTool({
    name: 'zapi_mobile_registration_available',
    title: 'Verificar disponibilidade do numero',
    description:
      'Verifica se um número está disponível para ser registrado no WhatsApp diretamente pela Z-API (sem ler QR Code) ' +
      'e se ele está banido. Retorna "available", "blocked", "appealToken" (usado para pedir desbanimento), os tempos ' +
      'de espera de cada método de envio do código (smsWaitSeconds, voiceWaitSeconds, waOldWaitSeconds) e ' +
      '"waOldEligible". É o primeiro passo do fluxo de registro mobile. ATENÇÃO: disponível APENAS para instâncias do ' +
      'tipo "mobile" (API oficial de registro da Z-API), que pode exigir contratação específica; em instâncias comuns ' +
      '(QR Code) a chamada falha. POST /mobile/registration-available',
    inputSchema: {
      ddi,
      phone: mobilePhone,
    },
    handler: (args) =>
      zapiRequest('POST', '/mobile/registration-available', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mobile_request_registration_code',
    title: 'Solicitar codigo de registro',
    description:
      'Solicita o envio do código de confirmação de registro para o número informado, escolhendo o método de entrega ' +
      '(SMS, chamada de voz ou popup dentro do WhatsApp). O número deve ser o mesmo verificado previamente em ' +
      'zapi_mobile_registration_available. Se a resposta trouxer um captcha, responda-o com zapi_mobile_respond_captcha ' +
      'antes de receber o código. ATENÇÃO: disponível APENAS para instâncias do tipo "mobile" (API oficial de registro ' +
      'da Z-API), que pode exigir contratação específica. POST /mobile/request-registration-code',
    inputSchema: {
      ddi,
      phone: mobilePhone,
      method: z
        .enum(['sms', 'voice', 'wa_old'])
        .describe(
          'Método de entrega do código: "sms" (mensagem de texto), "voice" (chamada de voz) ou "wa_old" (popup no WhatsApp do aparelho antigo).',
        ),
    },
    handler: (args) =>
      zapiRequest('POST', '/mobile/request-registration-code', {
        body: toBody(args),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_mobile_confirm_registration_code',
    title: 'Confirmar codigo de registro',
    description:
      'Confirma o código de registro recebido por SMS, chamada de voz ou popup, concluindo a conexão do número. Se a ' +
      'resposta trouxer "deviceConfirm": true, o usuário precisa confirmar a transferência no celular e em seguida ' +
      'deve-se chamar zapi_mobile_device_transfer_confirmed. Se a conta tiver PIN de duas etapas, use ' +
      'zapi_mobile_confirm_pin_code. ATENÇÃO: disponível APENAS para instâncias do tipo "mobile" (API oficial de ' +
      'registro da Z-API), que pode exigir contratação específica. POST /mobile/confirm-registration-code',
    inputSchema: {
      code: z.string().describe('Código de confirmação recebido no número (ex.: "123456").'),
    },
    handler: (args) =>
      zapiRequest('POST', '/mobile/confirm-registration-code', {
        body: toBody(args),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_mobile_respond_captcha',
    title: 'Responder captcha do registro',
    description:
      'Responde o captcha exigido pelo WhatsApp durante a solicitação do código de registro. O captcha é exibido na ' +
      'imagem retornada por zapi_mobile_request_registration_code. ATENÇÃO: disponível APENAS para instâncias do tipo ' +
      '"mobile" (API oficial de registro da Z-API), que pode exigir contratação específica. POST /mobile/respond-captcha',
    inputSchema: {
      captcha: z
        .string()
        .describe('Texto do captcha lido na imagem retornada na solicitação do código de confirmação.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/mobile/respond-captcha', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mobile_confirm_pin_code',
    title: 'Confirmar PIN de duas etapas',
    description:
      'Informa o código PIN da verificação em duas etapas da conta WhatsApp, exigido durante o registro quando a conta ' +
      'possui essa proteção ativada. Se o PIN foi esquecido, use zapi_mobile_recovery_pin_code. ATENÇÃO: disponível ' +
      'APENAS para instâncias do tipo "mobile" (API oficial de registro da Z-API), que pode exigir contratação ' +
      'específica. POST /mobile/confirm-pin-code',
    inputSchema: {
      code: z.string().describe('Código PIN (6 dígitos) da verificação em duas etapas da conta WhatsApp.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/mobile/confirm-pin-code', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mobile_recovery_pin_code',
    title: 'Recuperar PIN de duas etapas',
    description:
      'Inicia a recuperação do código PIN de duas etapas: o WhatsApp envia um email de recuperação para o endereço ' +
      'cadastrado na conta (consulte com zapi_get_security_email). Não recebe parâmetros. ATENÇÃO: disponível APENAS ' +
      'para instâncias do tipo "mobile" (API oficial de registro da Z-API), que pode exigir contratação específica. ' +
      'POST /mobile/recovery-pin-code',
    handler: (args) => zapiRequest('POST', '/mobile/recovery-pin-code', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mobile_request_unbanning',
    title: 'Solicitar desbanimento do numero',
    description:
      'Envia ao WhatsApp um pedido de revisão (apelação) para desbanir o número, usando o "appealToken" retornado por ' +
      'zapi_mobile_registration_available quando o número aparece como bloqueado. Retorna o status da análise ' +
      '("IN_REVIEW" ou "UNBANNED"). ATENÇÃO: disponível APENAS para instâncias do tipo "mobile" (API oficial de ' +
      'registro da Z-API), que pode exigir contratação específica. POST /mobile/request-unbanning',
    inputSchema: {
      appealToken: z
        .string()
        .describe(
          'Token de apelação para desbanimento, retornado no campo "appealToken" da verificação de disponibilidade.',
        ),
      description: z
        .string()
        .describe('Justificativa do pedido de desbanimento, que será analisada pela equipe do WhatsApp.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/mobile/request-unbanning', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_mobile_device_transfer_confirmed',
    title: 'Confirmar transferencia no celular',
    description:
      'Finaliza a transferência do WhatsApp do celular para a instância Z-API. Deve ser chamado somente DEPOIS que ' +
      'zapi_mobile_confirm_registration_code retornar "deviceConfirm": true E o usuário tiver confirmado a notificação ' +
      'de transferência no aparelho. Não recebe parâmetros. ATENÇÃO: disponível APENAS para instâncias do tipo ' +
      '"mobile" (API oficial de registro da Z-API), que pode exigir contratação específica. ' +
      'GET /mobile/device-transfer-confirmed',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/mobile/device-transfer-confirmed', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_security_email',
    title: 'Consultar email de recuperacao',
    description:
      'Consulta o email cadastrado na conta WhatsApp da instância, usado para recuperar o PIN de duas etapas. Retorna ' +
      '"hasEmail", "email" e "verified". Não recebe parâmetros. ATENÇÃO: disponível APENAS para instâncias do tipo ' +
      '"mobile" (API oficial de registro da Z-API), que pode exigir contratação específica. GET /security/email',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/security/email', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_security_email',
    title: 'Cadastrar email de recuperacao',
    description:
      'Cadastra um email de recuperação na conta WhatsApp da instância (usado para recuperar o PIN de duas etapas). ' +
      'Retorna "VERIFY_EMAIL": um código de verificação é enviado ao endereço informado e deve ser confirmado com ' +
      'zapi_verify_security_email. ATENÇÃO: disponível APENAS para instâncias do tipo "mobile" (API oficial de registro ' +
      'da Z-API), que pode exigir contratação específica. POST /security/email',
    inputSchema: {
      email: z.string().describe('Endereço de email a ser cadastrado na conta WhatsApp (ex.: exemplo@email.com).'),
    },
    handler: (args) => zapiRequest('POST', '/security/email', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_verify_security_email',
    title: 'Verificar email de recuperacao',
    description:
      'Conclui o cadastro do email de recuperação informando o código de verificação enviado para o endereço cadastrado ' +
      'com zapi_set_security_email. ATENÇÃO: disponível APENAS para instâncias do tipo "mobile" (API oficial de ' +
      'registro da Z-API), que pode exigir contratação específica. POST /security/verify-email',
    inputSchema: {
      verificationCode: z.string().describe('Código de verificação enviado para o email cadastrado na conta.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/security/verify-email', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_security_email',
    title: 'Remover email de recuperacao',
    description:
      'Remove o email de recuperação cadastrado na conta WhatsApp da instância. Ação destrutiva: sem o email não será ' +
      'possível recuperar o PIN de duas etapas caso ele seja esquecido. Não recebe parâmetros. ATENÇÃO: disponível ' +
      'APENAS para instâncias do tipo "mobile" (API oficial de registro da Z-API), que pode exigir contratação ' +
      'específica. POST /security/email/remove',
    annotations: { destructiveHint: true },
    handler: (args) => zapiRequest('POST', '/security/email/remove', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_two_fa_status',
    title: 'Verificar PIN de duas etapas',
    description:
      'Verifica se a conta WhatsApp da instância possui código PIN de verificação em duas etapas cadastrado. Retorna ' +
      '"hasCode". Não recebe parâmetros. ATENÇÃO: disponível APENAS para instâncias do tipo "mobile" (API oficial de ' +
      'registro da Z-API), que pode exigir contratação específica. GET /security/two-fa-code',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/security/two-fa-code', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_two_fa_code',
    title: 'Cadastrar PIN de duas etapas',
    description:
      'Cadastra (ou atualiza) o código PIN da verificação em duas etapas da conta WhatsApp da instância. Guarde o PIN: ' +
      'ele será exigido ao reconectar o número. ATENÇÃO: disponível APENAS para instâncias do tipo "mobile" (API ' +
      'oficial de registro da Z-API), que pode exigir contratação específica. POST /security/two-fa-code',
    inputSchema: {
      code: z.string().describe('Código PIN a ser cadastrado (6 dígitos numéricos).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/security/two-fa-code', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_two_fa_code',
    title: 'Remover PIN de duas etapas',
    description:
      'Remove o código PIN da verificação em duas etapas da conta WhatsApp da instância. Ação destrutiva: reduz a ' +
      'segurança da conta e não pode ser desfeita sem cadastrar um novo PIN. Não recebe parâmetros. ATENÇÃO: ' +
      'disponível APENAS para instâncias do tipo "mobile" (API oficial de registro da Z-API), que pode exigir ' +
      'contratação específica. POST /security/two-fa-code/remove',
    annotations: { destructiveHint: true },
    handler: (args) => zapiRequest('POST', '/security/two-fa-code/remove', { instanceAlias: args.instanceAlias }),
  }),
];
