import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, phone, type ToolDef } from '@/lib/tool';

/** Agenda de contatos e gerenciamento de conversas (chats) da instancia. */
export const chatsContactsTools: ToolDef[] = [
  // ----------------------------------------------------------------- CONTATOS
  defineTool({
    name: 'zapi_get_contacts',
    title: 'Listar contatos',
    description:
      'Lista os contatos salvos na agenda do WhatsApp conectado à instância, de forma paginada. Retorna nome, nome curto (vendor) e telefone de cada contato. Use páginas menores (ex.: pageSize 50) para agendas grandes. GET /contacts',
    inputSchema: {
      page: z.number().int().min(1).describe('Número da página a consultar, começando em 1.'),
      pageSize: z.number().int().min(1).describe('Quantidade de contatos por página (ex.: 50, 100).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/contacts', {
        query: { page: args.page, pageSize: args.pageSize },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_add_contacts',
    title: 'Adicionar contatos na agenda',
    description:
      'Adiciona um ou mais contatos à agenda do celular conectado à instância. O corpo enviado é um array puro de contatos, permitindo cadastrar vários de uma só vez. POST /contacts/add',
    inputSchema: {
      contacts: z
        .array(
          z.object({
            firstName: z.string().describe('Primeiro nome do contato (obrigatório).'),
            lastName: z.string().optional().describe('Opcional. Sobrenome do contato.'),
            phone: z
              .string()
              .describe('Telefone do contato no formato DDI+DDD+número (ex.: 5511999999999), somente dígitos.'),
          }),
        )
        .describe('Lista de contatos a adicionar na agenda. Enviada como array JSON puro no corpo da requisição.'),
    },
    handler: (args) => zapiRequest('POST', '/contacts/add', { body: args.contacts, instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_remove_contacts',
    title: 'Remover contatos da agenda',
    description:
      'Remove contatos da agenda do celular conectado à instância. O corpo enviado é um array puro de telefones. Ação irreversível: os contatos removidos precisarão ser cadastrados novamente. DELETE /contacts/remove',
    inputSchema: {
      phones: z
        .array(z.string())
        .describe(
          'Lista de telefones a remover, no formato DDI+DDD+número (ex.: ["5511999999999"]). Enviada como array JSON puro no corpo.',
        ),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', '/contacts/remove', { body: args.phones, instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_contact_metadata',
    title: 'Detalhes de um contato',
    description:
      'Retorna os metadados de um contato específico da agenda: nome, nome de notificação (pushname), se é um contato comercial (business), descrição/recado e foto de perfil. GET /contacts/{phone}',
    inputSchema: {
      phone,
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/contacts/${encodeURIComponent(args.phone)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_profile_picture',
    title: 'Obter foto de perfil',
    description:
      'Obtém o link da foto de perfil de um contato ou grupo. Atenção: o link retornado é temporário e fica válido por aproximadamente 48 horas — baixe/armazene a imagem se precisar dela por mais tempo. GET /profile-picture',
    inputSchema: {
      phone,
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/profile-picture', { query: { phone: args.phone }, instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_phone_exists',
    title: 'Verificar se número tem WhatsApp',
    description:
      'Verifica se um único número possui conta ativa no WhatsApp e retorna o número no formato correto de envio. Útil para validar leads antes de disparar mensagens e evitar erros de entrega. GET /phone-exists/{phone}',
    inputSchema: {
      phone,
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/phone-exists/${encodeURIComponent(args.phone)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_phone_exists_batch',
    title: 'Verificar números em lote',
    description:
      'Verifica em lote quais números possuem WhatsApp, aceitando até 50.000 telefones por chamada. Retorna, para cada número, se existe conta ativa e o telefone no formato correto de envio. Ideal para higienizar listas antes de campanhas. POST /phone-exists-batch',
    inputSchema: {
      phones: z
        .array(z.string())
        .describe(
          'Lista de telefones a verificar, no formato DDI+DDD+número (ex.: ["5511999999999"]). Limite de 50.000 por requisição.',
        ),
    },
    handler: (args) =>
      zapiRequest('POST', '/phone-exists-batch', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_modify_blocked_contact',
    title: 'Bloquear ou desbloquear contato',
    description:
      'Bloqueia ou desbloqueia um contato no WhatsApp conectado à instância. Use action "block" para bloquear (o contato deixa de conseguir enviar mensagens) e "unblock" para desbloquear. POST /contacts/modify-blocked',
    inputSchema: {
      phone,
      action: z
        .enum(['block', 'unblock'])
        .describe('Ação a executar: "block" para bloquear o contato ou "unblock" para desbloquear.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/contacts/modify-blocked', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_report_contact',
    title: 'Denunciar contato',
    description:
      'Denuncia (reporta) um contato ao WhatsApp, por exemplo em casos de spam ou abuso. Não requer corpo na requisição — apenas o telefone no path. Use com cautela: denúncias indevidas podem prejudicar a reputação do seu número. POST /contacts/{phone}/report',
    inputSchema: {
      phone,
    },
    handler: (args) =>
      zapiRequest('POST', `/contacts/${encodeURIComponent(args.phone)}/report`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  // -------------------------------------------------------------------- CHATS
  defineTool({
    name: 'zapi_get_chats',
    title: 'Listar chats',
    description:
      'Lista de forma paginada as conversas (chats) da instância, incluindo contatos e grupos, com nome, telefone/ID, quantidade de mensagens não lidas e horário da última mensagem. GET /chats',
    inputSchema: {
      page: z.number().int().min(1).describe('Número da página a consultar, começando em 1.'),
      pageSize: z.number().int().min(1).describe('Quantidade de chats por página (ex.: 50, 100).'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/chats', {
        query: { page: args.page, pageSize: args.pageSize },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_get_chat_metadata',
    title: 'Detalhes de um chat',
    description:
      'Retorna os metadados de uma conversa específica: nome, se está arquivada, fixada, silenciada (mute) até quando, se está marcada como não lida e a configuração de mensagens temporárias. GET /chats/{phone}',
    inputSchema: {
      phone,
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/chats/${encodeURIComponent(args.phone)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_modify_chat',
    title: 'Modificar chat (ler, arquivar, fixar, silenciar, limpar, apagar)',
    description:
      'Tool unificada para modificar o estado de uma conversa. Todas as operações usam o MESMO endpoint POST /modify-chat, mudando apenas o campo "action": "read"/"unread" (marcar como lida ou não lida), "archive"/"unarchive" (arquivar ou desarquivar), "pin"/"unpin" (fixar ou desafixar no topo), "mute"/"unmute" (silenciar ou reativar notificações), "clear" (limpar o histórico mantendo o chat) e "delete" (apagar a conversa inteira). As ações "clear" e "delete" são irreversíveis. POST /modify-chat',
    inputSchema: {
      phone,
      action: z
        .enum(['read', 'unread', 'archive', 'unarchive', 'pin', 'unpin', 'mute', 'unmute', 'clear', 'delete'])
        .describe(
          'Ação a aplicar no chat: read | unread | archive | unarchive | pin | unpin | mute | unmute | clear (limpa mensagens) | delete (apaga a conversa).',
        ),
    },
    handler: (args) => zapiRequest('POST', '/modify-chat', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_send_chat_expiration',
    title: 'Configurar mensagens temporárias',
    description:
      'Define o tempo de expiração das mensagens temporárias de uma conversa. As mensagens somem automaticamente após o período escolhido: 24_HOURS, 7_DAYS, 90_DAYS ou OFF para desativar. POST /send-chat-expiration',
    inputSchema: {
      phone,
      chatExpiration: z
        .enum(['24_HOURS', '7_DAYS', '90_DAYS', 'OFF'])
        .describe(
          'Tempo de expiração das mensagens: "24_HOURS" (24 horas), "7_DAYS" (7 dias), "90_DAYS" (90 dias) ou "OFF" (desativa as mensagens temporárias).',
        ),
    },
    handler: (args) =>
      zapiRequest('POST', '/send-chat-expiration', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),
];
