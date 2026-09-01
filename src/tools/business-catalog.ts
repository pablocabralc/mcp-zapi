import { z } from 'zod';
import { toBody, zapiRequest } from '@/lib/zapi-client';
import { defineTool, phone, type ToolDef } from '@/lib/tool';

/** Catalogo do WhatsApp Business: produtos, carrinho e colecoes. */
export const businessCatalogTools: ToolDef[] = [
  defineTool({
    name: 'zapi_save_product',
    title: 'Salvar produto no catalogo',
    description:
      'Cria ou atualiza um produto do catalogo do WhatsApp Business (a Z-API nao possui endpoint separado de criacao — este mesmo endpoint faz as duas coisas). Preços são sempre em CENTAVOS (ex.: R$ 19,90 = 1990). Retorna o objeto com o `id` do produto, que deve ser guardado para consultar, editar, excluir ou vincular a coleções. Requer que a instância esteja conectada a uma conta WhatsApp Business com catálogo habilitado. POST /products',
    inputSchema: {
      name: z.string().describe('Nome do produto como aparecerá no catálogo.'),
      price: z
        .number()
        .int()
        .describe('Preço do produto em CENTAVOS, sem separadores (ex.: 1990 representa R$ 19,90).'),
      currency: z.string().describe('Código da moeda no padrão ISO 4217 (ex.: BRL, USD, EUR).'),
      description: z.string().describe('Descrição detalhada do produto exibida na ficha do catálogo.'),
      images: z
        .array(z.string())
        .describe('Lista de URLs públicas das imagens do produto. A primeira imagem costuma ser usada como capa.'),
      isHidden: z
        .boolean()
        .optional()
        .describe('Opcional. Quando true, o produto fica oculto para os clientes no catálogo público.'),
      salePrice: z
        .number()
        .int()
        .optional()
        .describe('Opcional. Preço promocional em CENTAVOS (ex.: 1490 representa R$ 14,90). Deve ser menor que `price`.'),
      retailerId: z
        .string()
        .optional()
        .describe('Opcional. Código/SKU do produto no seu sistema (identificador do varejista), útil para conciliação.'),
      url: z.string().optional().describe('Opcional. URL da página do produto no seu site ou e-commerce.'),
    },
    handler: (args) => zapiRequest('POST', '/products', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_products',
    title: 'Listar produtos do catalogo',
    description:
      'Lista os produtos do catálogo da SUA instância (o número conectado). A resposta é paginada: quando houver mais itens, ela traz um cursor que deve ser reenviado em `nextCursor` para buscar a próxima página. Se o cursor for muito longo e a chamada falhar com erro 414 (URI muito longa), use `zapi_get_products_v2`, que envia o cursor pelo corpo. GET /catalogs',
    inputSchema: {
      nextCursor: z
        .string()
        .optional()
        .describe('Opcional. Cursor de paginação retornado na chamada anterior; omita para buscar a primeira página.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/catalogs', { query: { nextCursor: args.nextCursor }, instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_products_v2',
    title: 'Listar produtos do catalogo (cursor no body)',
    description:
      'Mesma listagem de produtos do catálogo da SUA instância que `zapi_get_products`, porém com a paginação enviada no corpo da requisição. Prefira esta versão quando o cursor for extenso, pois evita o erro HTTP 414 (URI too long) causado por cursores grandes na query string. POST /catalogs',
    inputSchema: {
      nextCursor: z
        .string()
        .optional()
        .describe('Opcional. Cursor de paginação retornado na chamada anterior; omita para buscar a primeira página.'),
    },
    handler: (args) => zapiRequest('POST', '/catalogs', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_get_products_by_phone',
    title: 'Listar catalogo de outro numero',
    description:
      'Consulta o catálogo de QUALQUER número WhatsApp Business (não apenas o seu), informando o telefone do comerciante. Útil para ver os produtos de um fornecedor ou parceiro antes de encaminhá-los. A resposta é paginada via `nextCursor`; se o cursor ficar muito longo e gerar erro 414, use `zapi_get_products_by_phone_v2`. GET /catalogs/{phone}',
    inputSchema: {
      phone,
      nextCursor: z
        .string()
        .optional()
        .describe('Opcional. Cursor de paginação retornado na chamada anterior; omita para buscar a primeira página.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/catalogs/${encodeURIComponent(args.phone)}`, {
        query: { nextCursor: args.nextCursor },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_get_products_by_phone_v2',
    title: 'Listar catalogo de outro numero (cursor no body)',
    description:
      'Mesma consulta do catálogo de qualquer número WhatsApp Business que `zapi_get_products_by_phone`, porém com a paginação enviada no corpo da requisição. Prefira esta versão quando o cursor for extenso, pois evita o erro HTTP 414 (URI too long). POST /catalogs/{phone}',
    inputSchema: {
      phone,
      nextCursor: z
        .string()
        .optional()
        .describe('Opcional. Cursor de paginação retornado na chamada anterior; omita para buscar a primeira página.'),
    },
    handler: (args) =>
      zapiRequest('POST', `/catalogs/${encodeURIComponent(args.phone)}`, {
        body: toBody(args, ['phone']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_get_product',
    title: 'Detalhar produto do catalogo',
    description:
      'Retorna os dados completos de um único produto do catálogo (nome, descrição, preço, preço promocional, moeda, imagens, visibilidade e identificadores) a partir do seu ID. GET /products/{productId}',
    inputSchema: {
      productId: z
        .string()
        .describe('ID do produto no catálogo, retornado por `zapi_save_product` ou pelas listagens de catálogo.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/products/${encodeURIComponent(args.productId)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_delete_product',
    title: 'Excluir produto do catalogo',
    description:
      'Exclui definitivamente um produto do catálogo do WhatsApp Business. A operação é irreversível: o produto some do catálogo e de todas as coleções em que estiver vinculado. DELETE /products/{productId}',
    inputSchema: {
      productId: z.string().describe('ID do produto que será excluído do catálogo.'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', `/products/${encodeURIComponent(args.productId)}`, { instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_save_catalog_config',
    title: 'Configurar carrinho do catalogo',
    description:
      'Ativa ou desativa o carrinho de compras do catálogo do WhatsApp Business. Com o carrinho habilitado, os clientes podem juntar vários produtos e enviar o pedido em uma única mensagem; desabilitado, eles apenas visualizam os produtos. POST /catalogs/config',
    inputSchema: {
      cartEnabled: z
        .boolean()
        .describe('true para habilitar o carrinho de compras no catálogo; false para desabilitá-lo.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/catalogs/config', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_create_collection',
    title: 'Criar colecao de produtos',
    description:
      'Cria uma coleção (categoria) no catálogo do WhatsApp Business agrupando produtos já cadastrados. Coleções ajudam o cliente a navegar pelo catálogo por tema, marca ou tipo de produto. Retorna o ID da coleção criada. POST /catalogs/collection',
    inputSchema: {
      name: z.string().describe('Nome da coleção como aparecerá no catálogo (ex.: "Lançamentos", "Promoções").'),
      productIds: z
        .array(z.string())
        .describe('Lista de IDs dos produtos que farão parte da coleção (os produtos precisam existir no catálogo).'),
    },
    handler: (args) =>
      zapiRequest('POST', '/catalogs/collection', { body: toBody(args), instanceAlias: args.instanceAlias }),
  }),

  defineTool({
    name: 'zapi_list_collections',
    title: 'Listar colecoes do catalogo',
    description:
      'Lista as coleções (categorias) existentes no catálogo da sua instância, com seus IDs e nomes. A resposta é paginada: reenvie o cursor recebido em `nextCursor` para obter a próxima página. GET /catalogs/collection',
    inputSchema: {
      nextCursor: z
        .string()
        .optional()
        .describe('Opcional. Cursor de paginação retornado na chamada anterior; omita para buscar a primeira página.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', '/catalogs/collection', {
        query: { nextCursor: args.nextCursor },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_delete_collection',
    title: 'Excluir colecao do catalogo',
    description:
      'Exclui uma coleção do catálogo do WhatsApp Business. Os produtos NÃO são apagados — apenas o agrupamento deixa de existir. A operação é irreversível. DELETE /catalogs/collection/{collectionId}',
    inputSchema: {
      collectionId: z.string().describe('ID da coleção que será excluída.'),
    },
    annotations: { destructiveHint: true },
    handler: (args) =>
      zapiRequest('DELETE', `/catalogs/collection/${encodeURIComponent(args.collectionId)}`, {
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_edit_collection',
    title: 'Renomear colecao do catalogo',
    description:
      'Altera o nome de uma coleção existente no catálogo do WhatsApp Business. Os produtos vinculados permanecem inalterados. POST /catalogs/collection-edit/{collectionId}',
    inputSchema: {
      collectionId: z.string().describe('ID da coleção que será editada.'),
      name: z.string().describe('Novo nome da coleção.'),
    },
    handler: (args) =>
      zapiRequest('POST', `/catalogs/collection-edit/${encodeURIComponent(args.collectionId)}`, {
        body: toBody(args, ['collectionId']),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_list_collection_products',
    title: 'Listar produtos de uma colecao',
    description:
      'Lista os produtos pertencentes a uma coleção específica do catálogo de um número WhatsApp Business (o seu ou o de outro comerciante). Informe o telefone do dono do catálogo e o ID da coleção, que é obrigatório. A resposta é paginada via `nextCursor`. GET /catalogs/collection-products/{phone}',
    inputSchema: {
      phone,
      collectionId: z.string().describe('Obrigatório. ID da coleção cujos produtos serão listados.'),
      nextCursor: z
        .string()
        .optional()
        .describe('Opcional. Cursor de paginação retornado na chamada anterior; omita para buscar a primeira página.'),
    },
    annotations: { readOnlyHint: true },
    handler: (args) =>
      zapiRequest('GET', `/catalogs/collection-products/${encodeURIComponent(args.phone)}`, {
        query: { collectionId: args.collectionId, nextCursor: args.nextCursor },
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_add_product_to_collection',
    title: 'Adicionar produtos a uma colecao',
    description:
      'Adiciona um ou mais produtos já cadastrados a uma coleção do catálogo. IMPORTANTE: o WhatsApp recria a coleção nesta operação, ou seja, o ID da coleção MUDA — sempre utilize o novo ID devolvido na resposta nas chamadas seguintes (listar, editar, remover produtos ou excluir); o ID antigo deixa de ser válido. POST /catalogs/collection/add-product',
    inputSchema: {
      collectionId: z.string().describe('ID atual da coleção que receberá os produtos.'),
      productIds: z.array(z.string()).describe('Lista de IDs dos produtos que serão adicionados à coleção.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/catalogs/collection/add-product', {
        body: toBody(args),
        instanceAlias: args.instanceAlias,
      }),
  }),

  defineTool({
    name: 'zapi_remove_product_from_collection',
    title: 'Remover produtos de uma colecao',
    description:
      'Remove um ou mais produtos de uma coleção do catálogo (os produtos continuam existindo no catálogo, apenas saem do agrupamento). IMPORTANTE: o WhatsApp recria a coleção nesta operação, ou seja, o ID da coleção MUDA — sempre utilize o novo ID devolvido na resposta nas chamadas seguintes; o ID antigo deixa de ser válido. POST /catalogs/collection/remove-product',
    inputSchema: {
      collectionId: z.string().describe('ID atual da coleção da qual os produtos serão removidos.'),
      productIds: z.array(z.string()).describe('Lista de IDs dos produtos que serão removidos da coleção.'),
    },
    handler: (args) =>
      zapiRequest('POST', '/catalogs/collection/remove-product', {
        body: toBody(args),
        instanceAlias: args.instanceAlias,
      }),
  }),
];
