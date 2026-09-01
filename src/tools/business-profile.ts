import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, phone, type ToolDef } from '@/lib/tool';

/** Perfil comercial (WhatsApp Business), etiquetas de conversas e anotacoes de chat. */
export const businessProfileTools: ToolDef[] = [
  defineTool({
    name: 'zapi_get_business_profile',
    title: 'Consultar perfil business',
    description:
      'Consulta o perfil comercial (WhatsApp Business) de um número. Retorna descrição da empresa, endereço, e-mail, websites, categorias, horários de funcionamento e se possui foto de capa. GET /business/profile',
    inputSchema: {
      phone,
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/business/profile', { query: { phone: args.phone }, instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_company_description',
    title: 'Definir descricao da empresa',
    description:
      'Define (ou remove) a descrição do perfil comercial da sua própria conta WhatsApp Business. Envie uma string vazia para remover a descrição atual. POST /business/company-description',
    inputSchema: {
      value: z.string().describe('Texto da descrição da empresa. Envie uma string vazia ("") para remover a descrição.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/business/company-description', {
        body: toBody(args),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_set_company_email',
    title: 'Definir e-mail da empresa',
    description:
      'Define (ou remove) o e-mail de contato exibido no perfil comercial da sua conta WhatsApp Business. Envie uma string vazia para remover o e-mail atual. POST /business/company-email',
    inputSchema: {
      value: z.string().describe('E-mail de contato da empresa (ex.: contato@empresa.com.br). Envie uma string vazia ("") para remover.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/business/company-email', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_company_address',
    title: 'Definir endereco da empresa',
    description:
      'Define (ou remove) o endereço exibido no perfil comercial da sua conta WhatsApp Business. Envie uma string vazia para remover o endereço atual. POST /business/company-address',
    inputSchema: {
      value: z
        .string()
        .describe('Endereço completo da empresa (ex.: Av. Paulista, 1000 - São Paulo/SP). Envie uma string vazia ("") para remover.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/business/company-address', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_company_websites',
    title: 'Definir websites da empresa',
    description:
      'Define os websites exibidos no perfil comercial da sua conta WhatsApp Business. O WhatsApp aceita no máximo 2 endereços; envie um array vazio para remover todos os websites cadastrados. POST /business/company-websites',
    inputSchema: {
      websites: z
        .array(z.string())
        .max(2)
        .describe('Lista de URLs dos sites da empresa (máximo 2, ex.: ["https://empresa.com.br"]). Envie um array vazio ([]) para remover todos.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/business/company-websites', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_set_business_hours',
    title: 'Definir horario de funcionamento',
    description:
      'Define o horário de funcionamento exibido no perfil comercial da sua conta WhatsApp Business. Escolha entre horários específicos por dia, aberto 24 horas ou somente por agendamento. POST /business/hours',
    inputSchema: {
      timezone: z
        .string()
        .describe('Fuso horário no padrão IANA usado para interpretar os horários (ex.: America/Sao_Paulo).'),
      mode: z
        .enum(['specificHours', 'open24h', 'appointmentOnly'])
        .optional()
        .describe(
          'Opcional. Modo de funcionamento: "specificHours" (horários específicos por dia, exige o campo days), "open24h" (aberto 24 horas) ou "appointmentOnly" (somente com agendamento).',
        ),
      days: z
        .array(
          z.object({
            dayOfWeek: z
              .string()
              .describe('Dia da semana em inglês e minúsculas (ex.: monday, tuesday, wednesday, thursday, friday, saturday, sunday).'),
            openTime: z.string().optional().describe('Opcional. Horário de abertura no formato HH:mm (ex.: 09:00).'),
            closeTime: z.string().optional().describe('Opcional. Horário de fechamento no formato HH:mm (ex.: 18:00).'),
          }),
        )
        .optional()
        .describe('Opcional. Lista de dias com seus horários de abertura e fechamento. Obrigatório quando mode for "specificHours".'),
    },
    handler: (args) => zapiRequest('POST', '/business/hours', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_available_categories',
    title: 'Listar categorias disponiveis',
    description:
      'Lista as categorias de negócio disponíveis no WhatsApp Business, com seus IDs e rótulos. Use o texto de busca para filtrar e depois aplique os IDs em zapi_set_company_categories. GET /business/available-categories',
    inputSchema: {
      query: z
        .string()
        .optional()
        .describe('Opcional. Texto de busca para filtrar as categorias pelo nome (ex.: "restaurante").'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/business/available-categories', {
        query: { query: args.query },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_set_company_categories',
    title: 'Definir categorias da empresa',
    description:
      'Define as categorias do perfil comercial da sua conta WhatsApp Business. Informe de 1 a 3 categorias, usando os IDs ou rótulos obtidos em zapi_get_available_categories. POST /business/categories',
    inputSchema: {
      categories: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe('Lista de 1 a 3 categorias, informadas por ID ou rótulo (consulte zapi_get_available_categories).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/business/categories', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_tags',
    title: 'Listar etiquetas',
    description:
      'Lista todas as etiquetas (labels) cadastradas na conta WhatsApp Business, com seus IDs, nomes e cores. GET /tags',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/tags', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_tag_colors',
    title: 'Listar cores de etiqueta',
    description:
      'Lista as cores disponíveis para etiquetas, retornando o índice numérico de cada cor para uso ao criar ou editar uma etiqueta. GET /business/tags/colors',
    annotations: { readOnlyHint: true },
    handler: (args) => zapiRequest('GET', '/business/tags/colors', { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_create_tag',
    title: 'Criar etiqueta',
    description:
      'Cria uma nova etiqueta (label) na conta WhatsApp Business para organizar conversas. POST /business/create-tag',
    inputSchema: {
      name: z.string().describe('Nome da etiqueta (ex.: "Cliente VIP").'),
      color: z
        .number()
        .int()
        .optional()
        .describe('Opcional. Índice numérico da cor da etiqueta (consulte zapi_get_tag_colors).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/business/create-tag', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_edit_tag',
    title: 'Editar etiqueta',
    description:
      'Edita o nome e/ou a cor de uma etiqueta existente da conta WhatsApp Business. POST /business/edit-tag/{tagId}',
    inputSchema: {
      tagId: z.string().describe('ID da etiqueta a ser editada (obtido em zapi_get_tags).'),
      name: z.string().describe('Novo nome da etiqueta.'),
      color: z
        .number()
        .int()
        .optional()
        .describe('Opcional. Novo índice numérico da cor da etiqueta (consulte zapi_get_tag_colors).'),
    },
    handler: (args) =>
      zapiRequest('POST', `/business/edit-tag/${encodeURIComponent(args.tagId)}`, {
        body: toBody(args, ['tagId']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_delete_tag',
    title: 'Excluir etiqueta',
    description:
      'Exclui permanentemente uma etiqueta da conta WhatsApp Business, removendo-a de todas as conversas em que estava aplicada. DELETE /business/tag/{tagId}',
    inputSchema: {
      tagId: z.string().describe('ID da etiqueta a ser excluída (obtido em zapi_get_tags).'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', `/business/tag/${encodeURIComponent(args.tagId)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_add_tag_to_chat',
    title: 'Aplicar etiqueta a conversa',
    description: 'Aplica uma etiqueta existente a uma conversa (chat). PUT /chats/{phone}/tags/{tag}/add',
    inputSchema: {
      phone,
      tag: z.string().describe('ID da etiqueta a ser aplicada (obtido em zapi_get_tags).'),
    },
    handler: (args) =>
      zapiRequest(
        'PUT',
        `/chats/${encodeURIComponent(args.phone)}/tags/${encodeURIComponent(args.tag)}/add`,
        { instanceAlias: args.instanceAlias },
      ),
  }),

  defineTool({
    name: 'zapi_remove_tag_from_chat',
    title: 'Remover etiqueta de conversa',
    description: 'Remove uma etiqueta aplicada a uma conversa (chat). PUT /chats/{phone}/tags/{tag}/remove',
    inputSchema: {
      phone,
      tag: z.string().describe('ID da etiqueta a ser removida da conversa (obtido em zapi_get_tags).'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest(
        'PUT',
        `/chats/${encodeURIComponent(args.phone)}/tags/${encodeURIComponent(args.tag)}/remove`,
        { instanceAlias: args.instanceAlias },
      ),
  }),

  defineTool({
    name: 'zapi_set_chat_notes',
    title: 'Definir anotacoes da conversa',
    description:
      'Define o texto das anotações internas de uma conversa (chat), visível apenas no WhatsApp Business. POST /chats/{phone}/notes',
    inputSchema: {
      phone,
      notes: z.string().describe('Texto das anotações da conversa.'),
    },
    handler: (args) =>
      zapiRequest('POST', `/chats/${encodeURIComponent(args.phone)}/notes`, {
        body: toBody(args, ['phone']),
        instanceAlias: args.instanceAlias,
      }),
  }),
];
