# MCP Z-API

[![Licença: Apache 2.0](https://img.shields.io/badge/licen%C3%A7a-Apache%202.0-blue.svg)](LICENSE)
![Projeto não oficial](https://img.shields.io/badge/projeto-n%C3%A3o%20oficial-orange.svg)
![MCP](https://img.shields.io/badge/MCP-Streamable%20HTTP-6f42c1.svg)

Servidor **MCP (Model Context Protocol) remoto** que transforma a API da [Z-API](https://developer.z-api.io)
(WhatsApp) em **217 tools** que assistentes de IA — Claude, Cursor, VS Code e outros clientes MCP — conseguem usar
diretamente. Pronto para deploy na Vercel e protegido por **OAuth 2.1 com PKCE**.

> [!WARNING]
> **Este é um projeto independente e NÃO oficial.** Não é afiliado, endossado, patrocinado ou mantido pela
> Z-API nem pela Meta/WhatsApp. "Z-API" e "WhatsApp" são marcas de seus respectivos titulares. Para usar, você
> precisa de uma conta própria na Z-API e fica sujeito aos termos de uso dela e do WhatsApp. Veja
> [Isenção de responsabilidade](#isenção-de-responsabilidade).

---

## Sumário

- [O que é](#o-que-é)
- [Como funciona](#como-funciona)
- [Endpoints da Z-API cobertos](#endpoints-da-z-api-cobertos)
- [Endpoints do próprio servidor](#endpoints-do-próprio-servidor)
- [Deploy na Vercel](#deploy-na-vercel)
- [Conectar um cliente MCP](#conectar-um-cliente-mcp)
- [Múltiplas instâncias](#múltiplas-instâncias)
- [Segurança e OAuth 2.1](#segurança-e-oauth-21)
- [Desenvolvimento local](#desenvolvimento-local)
- [Licença e créditos](#licença-e-créditos)
- [Isenção de responsabilidade](#isenção-de-responsabilidade)

---

## O que é

A Z-API é um serviço pago que expõe uma conta de WhatsApp por meio de uma API HTTP. Este projeto coloca uma
camada **MCP** na frente dessa API: cada endpoint vira uma *tool* descrita em português, com parâmetros validados,
que um assistente de IA pode chamar sozinho — por exemplo, "envie esta proposta em PDF para o grupo de vendas" ou
"liste os chats não lidos de hoje".

- **217 tools** cobrindo instância, mensagens, grupos, comunidades, canais, catálogo, webhooks, privacidade e mais
- **Transporte Streamable HTTP** em `/api/mcp`, funciona como servidor remoto (não precisa rodar nada na máquina
  de quem usa)
- **OAuth 2.1 embutido e stateless** — sem banco de dados, roda em qualquer function da Vercel
- **Credenciais da Z-API ficam só no servidor**, em variáveis de ambiente; o assistente nunca vê os tokens
- **Várias instâncias** de WhatsApp no mesmo servidor, escolhidas por tool
- **Filtro de grupos de tools** para clientes que degradam com muitas tools

## Como funciona

```
┌──────────────────┐   OAuth 2.1 + PKCE   ┌──────────────────────────┐   HTTPS + tokens    ┌─────────┐
│  Cliente MCP     │ ───────────────────▶ │  mcp-zapi (Vercel)       │ ──────────────────▶ │  Z-API  │ ──▶ WhatsApp
│  Claude, Cursor… │ ◀─────────────────── │  /api/mcp  ·  217 tools  │ ◀────────────────── │         │
└──────────────────┘   resultado da tool  └──────────────────────────┘   resposta JSON     └─────────┘
```

1. O cliente MCP se conecta em `/api/mcp`, descobre o servidor OAuth e abre uma tela de login.
2. Você autoriza com o usuário e senha definidos nas variáveis de ambiente.
3. O assistente chama uma tool (ex.: `zapi_send_text`); o servidor valida os argumentos, injeta as credenciais da
   instância e repassa para `https://api.z-api.io/instances/{id}/token/{token}/...`.
4. A resposta da Z-API volta para o assistente como resultado da tool.

---

## Endpoints da Z-API cobertos

Todas as tools usam o prefixo `zapi_` e aceitam o argumento opcional `instanceAlias` para escolher entre
[múltiplas instâncias](#múltiplas-instâncias). Os paths abaixo são relativos a
`https://api.z-api.io/instances/{instanceId}/token/{instanceToken}` — exceto os de **Parceiro**, que ficam na
raiz da API e usam o header `Partner-Token`.

| Área | Conteúdo | Grupo (`ZAPI_TOOL_GROUPS`) | Tools |
|---|---|---|---:|
| Instância | status, QR code, pareamento, perfil e configurações da instância | `instancia` | 20 |
| Mensagens e mídia | texto, imagem, áudio, vídeo, documento, localização, contatos, reações | `mensagens` | 19 |
| Mensagens interativas | botões, listas, carrossel, enquetes, PIX, pedidos, eventos | `mensagens-interativas` | 20 |
| Chats e contatos | contatos, bloqueio, verificação de número, ações em chats | `chats-contatos` | 13 |
| Grupos | criação, participantes, admins, convites, menções | `grupos` | 22 |
| Comunidades e listas de transmissão | comunidades, vínculo de grupos, listas de transmissão | `comunidades` | 17 |
| Canais, chamadas e Meta AI | canais (newsletter), chamadas de voz/SIP, Meta AI | `canais` | 23 |
| Status (stories) | publicar e responder status | `status` | 6 |
| Catálogo business | produtos e coleções | `catalogo-business` | 15 |
| Perfil business e etiquetas | dados da empresa, horários, categorias, etiquetas, notas | `perfil-business` | 16 |
| Webhooks e fila | URLs de webhook, filtros e fila de envio | `webhooks` | 14 |
| Privacidade | visto por último, foto, recado, confirmação de leitura | `privacidade` | 8 |
| Mobile e segurança | registro de número, PIN, desbanimento, e-mail e 2FA | `mobile-seguranca` | 15 |
| Parceiro / integrador | gestão de instâncias (exige `ZAPI_PARTNER_TOKEN`) | `parceiro` | 9 |
| **Total** | | | **217** |

Clique em cada área para ver a lista completa de tools, com método HTTP e path:

<details>
<summary><strong>Instância</strong> — 20 tools (<code>instancia</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_get_status` | Status da instancia | `GET` | `/status` |
| `zapi_get_qr_code` | QRCode em bytes/base64 | `GET` | `/qr-code` |
| `zapi_get_qr_code_image` | QRCode em imagem | `GET` | `/qr-code/image` |
| `zapi_get_phone_code` | Codigo de pareamento por telefone | `GET` | `/phone-code/{phone}` |
| `zapi_restart_instance` | Reiniciar instancia | `GET` | `/restart` |
| `zapi_disconnect_instance` | Desconectar WhatsApp da instancia | `GET` | `/disconnect` |
| `zapi_get_device` | Dados do aparelho conectado | `GET` | `/device` |
| `zapi_get_me` | Dados e configuracoes da instancia | `GET` | `/me` |
| `zapi_get_my_profile_picture` | Foto de perfil da propria conta | `GET` | `/profile-picture` |
| `zapi_update_profile_picture` | Alterar foto de perfil | `PUT` | `/profile-picture` |
| `zapi_update_profile_name` | Alterar nome do perfil | `PUT` | `/profile-name` |
| `zapi_update_profile_description` | Alterar recado/descricao do perfil | `PUT` | `/profile-description` |
| `zapi_rename_instance` | Renomear instancia no painel Z-API | `PUT` | `/update-name` |
| `zapi_update_auto_read_message` | Leitura automatica de mensagens | `PUT` | `/update-auto-read-message` |
| `zapi_update_auto_read_status` | Visualizacao automatica de status | `PUT` | `/update-auto-read-status` |
| `zapi_update_call_reject_auto` | Rejeicao automatica de chamadas | `PUT` | `/update-call-reject-auto` |
| `zapi_update_call_reject_message` | Mensagem enviada ao rejeitar chamada | `PUT` | `/update-call-reject-message` |
| `zapi_get_extension_token` | Token da extensao | `GET` | `/extension-token` |
| `zapi_passkey_prologue` | Concluir challenge de passkey | `POST` | `/passkey-prologue` |
| `zapi_reset_passkey_challenge` | Resetar challenge de passkey | `POST` | `/reset-passkey-challenge` |

</details>

<details>
<summary><strong>Mensagens e mídia</strong> — 19 tools (<code>mensagens</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_send_text` | Enviar mensagem de texto | `POST` | `/send-text` |
| `zapi_send_image` | Enviar imagem | `POST` | `/send-image` |
| `zapi_send_sticker` | Enviar figurinha (sticker) | `POST` | `/send-sticker` |
| `zapi_send_gif` | Enviar GIF | `POST` | `/send-gif` |
| `zapi_send_audio` | Enviar audio / mensagem de voz | `POST` | `/send-audio` |
| `zapi_send_video` | Enviar video | `POST` | `/send-video` |
| `zapi_send_ptv` | Enviar video instantaneo (PTV) | `POST` | `/send-ptv` |
| `zapi_send_document` | Enviar documento | `POST` | `/send-document/{extension}` |
| `zapi_send_link` | Enviar link com preview | `POST` | `/send-link` |
| `zapi_send_location` | Enviar localizacao | `POST` | `/send-location` |
| `zapi_send_contact` | Enviar um contato | `POST` | `/send-contact` |
| `zapi_send_contacts` | Enviar varios contatos | `POST` | `/send-contacts` |
| `zapi_send_product` | Enviar produto do catalogo | `POST` | `/send-product` |
| `zapi_send_catalog` | Enviar catalogo | `POST` | `/send-catalog` |
| `zapi_forward_message` | Encaminhar mensagem | `POST` | `/forward-message` |
| `zapi_send_reaction` | Reagir a uma mensagem | `POST` | `/send-reaction` |
| `zapi_remove_reaction` | Remover reacao de uma mensagem | `POST` | `/send-remove-reaction` |
| `zapi_delete_message` | Apagar mensagem | `DELETE` | `/messages` |
| `zapi_read_message` | Marcar mensagem como lida | `POST` | `/read-message` |

</details>

<details>
<summary><strong>Mensagens interativas</strong> — 20 tools (<code>mensagens-interativas</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_send_button_actions` | Enviar botoes de acao | `POST` | `/send-button-actions` |
| `zapi_send_button_list` | Enviar botoes de resposta rapida | `POST` | `/send-button-list` |
| `zapi_send_button_list_image` | Enviar botoes com imagem | `POST` | `/send-button-list` |
| `zapi_send_button_list_video` | Enviar botoes com video | `POST` | `/send-button-list` |
| `zapi_send_option_list` | Enviar lista de opcoes (menu) | `POST` | `/send-option-list` |
| `zapi_send_button_otp` | Enviar botao de copiar codigo (OTP) | `POST` | `/send-button-otp` |
| `zapi_send_button_pix` | Enviar botao de chave Pix | `POST` | `/send-button-pix` |
| `zapi_send_carousel` | Enviar carrossel de cards | `POST` | `/send-carousel` |
| `zapi_send_poll` | Enviar enquete | `POST` | `/send-poll` |
| `zapi_send_poll_vote` | Votar em enquete | `POST` | `/send-poll-vote` |
| `zapi_send_order` | Enviar pedido | `POST` | `/send-order` |
| `zapi_order_status_update` | Atualizar status do pedido | `POST` | `/order-status-update` |
| `zapi_order_payment_update` | Atualizar pagamento do pedido | `POST` | `/order-payment-update` |
| `zapi_pin_message` | Fixar ou desafixar mensagem | `POST` | `/pin-message` |
| `zapi_send_newsletter_admin_invite` | Convidar administrador de newsletter | `POST` | `/send-newsletter-admin-invite` |
| `zapi_send_event` | Enviar evento | `POST` | `/send-event` |
| `zapi_send_edit_event` | Editar evento | `POST` | `/send-edit-event` |
| `zapi_send_event_response` | Responder convite de evento | `POST` | `/send-event-response` |
| `zapi_reply_button` | Simular clique em botao de lista | `POST` | `/reply-button` |
| `zapi_reply_template_button` | Simular clique em botao REPLY | `POST` | `/reply-template-button` |

</details>

<details>
<summary><strong>Chats e contatos</strong> — 13 tools (<code>chats-contatos</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_get_contacts` | Listar contatos | `GET` | `/contacts` |
| `zapi_add_contacts` | Adicionar contatos na agenda | `POST` | `/contacts/add` |
| `zapi_remove_contacts` | Remover contatos da agenda | `DELETE` | `/contacts/remove` |
| `zapi_get_contact_metadata` | Detalhes de um contato | `GET` | `/contacts/{phone}` |
| `zapi_get_profile_picture` | Obter foto de perfil | `GET` | `/profile-picture` |
| `zapi_phone_exists` | Verificar se número tem WhatsApp | `GET` | `/phone-exists/{phone}` |
| `zapi_phone_exists_batch` | Verificar números em lote | `POST` | `/phone-exists-batch` |
| `zapi_modify_blocked_contact` | Bloquear ou desbloquear contato | `POST` | `/contacts/modify-blocked` |
| `zapi_report_contact` | Denunciar contato | `POST` | `/contacts/{phone}/report` |
| `zapi_get_chats` | Listar chats | `GET` | `/chats` |
| `zapi_get_chat_metadata` | Detalhes de um chat | `GET` | `/chats/{phone}` |
| `zapi_modify_chat` | Modificar chat (ler, arquivar, fixar, silenciar, limpar, apagar) | `POST` | `/modify-chat` |
| `zapi_send_chat_expiration` | Configurar mensagens temporárias | `POST` | `/send-chat-expiration` |

</details>

<details>
<summary><strong>Grupos</strong> — 22 tools (<code>grupos</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_get_groups` | Listar grupos | `GET` | `/groups` |
| `zapi_create_group` | Criar grupo | `POST` | `/create-group` |
| `zapi_update_group_name` | Alterar nome do grupo | `POST` | `/update-group-name` |
| `zapi_update_group_photo` | Alterar foto do grupo | `POST` | `/update-group-photo` |
| `zapi_update_group_description` | Alterar descricao do grupo | `POST` | `/update-group-description` |
| `zapi_update_group_settings` | Alterar configuracoes do grupo | `POST` | `/update-group-settings` |
| `zapi_add_group_participant` | Adicionar participantes ao grupo | `POST` | `/add-participant` |
| `zapi_remove_group_participant` | Remover participantes do grupo | `POST` | `/remove-participant` |
| `zapi_approve_group_participant` | Aprovar entrada no grupo | `POST` | `/approve-participant` |
| `zapi_reject_group_participant` | Rejeitar entrada no grupo | `POST` | `/reject-participant` |
| `zapi_add_group_admin` | Promover participantes a administradores | `POST` | `/add-admin` |
| `zapi_remove_group_admin` | Rebaixar administradores do grupo | `POST` | `/remove-admin` |
| `zapi_leave_group` | Sair do grupo | `POST` | `/leave-group` |
| `zapi_get_group_metadata` | Obter metadados completos do grupo | `GET` | `/group-metadata/{phone}` |
| `zapi_get_light_group_metadata` | Obter metadados leves do grupo | `GET` | `/light-group-metadata/{phone}` |
| `zapi_get_group_invitation_metadata` | Obter metadados por link de convite | `GET` | `/group-invitation-metadata` |
| `zapi_get_group_invitation_link` | Obter link de convite do grupo | `GET` | `/group-invitation-link/{groupId}` |
| `zapi_redefine_group_invitation_link` | Redefinir link de convite do grupo | `POST` | `/redefine-invitation-link/{groupId}` |
| `zapi_accept_group_invite` | Aceitar convite de grupo | `GET` | `/accept-invite-group` |
| `zapi_mention_group_participants` | Mencionar participantes do grupo | `POST` | `/send-text` |
| `zapi_mention_all_group` | Mencionar todos do grupo | `POST` | `/send-text` |
| `zapi_mention_linked_groups` | Mencionar grupos vinculados | `POST` | `/send-text` |

</details>

<details>
<summary><strong>Comunidades e listas de transmissão</strong> — 17 tools (<code>comunidades</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_create_community` | Criar comunidade | `POST` | `/communities` |
| `zapi_list_communities` | Listar comunidades | `GET` | `/communities` |
| `zapi_link_groups_to_community` | Vincular grupos a comunidade | `POST` | `/communities/link` |
| `zapi_unlink_groups_from_community` | Desvincular grupos da comunidade | `POST` | `/communities/unlink` |
| `zapi_get_community_metadata` | Obter metadados da comunidade | `GET` | `/communities-metadata/{communityId}` |
| `zapi_redefine_community_invitation_link` | Redefinir link de convite da comunidade | `POST` | `/redefine-invitation-link/{communityId}` |
| `zapi_add_community_participant` | Adicionar participante a comunidade | `POST` | `/add-participant` |
| `zapi_remove_community_participant` | Remover participante da comunidade | `POST` | `/remove-participant` |
| `zapi_add_community_admin` | Promover administradores da comunidade | `POST` | `/add-admin` |
| `zapi_remove_community_admin` | Rebaixar administradores da comunidade | `POST` | `/remove-admin` |
| `zapi_community_settings` | Configurar permissoes da comunidade | `POST` | `/communities/settings` |
| `zapi_deactivate_community` | Desativar comunidade | `DELETE` | `/communities/{communityId}` |
| `zapi_update_community_description` | Atualizar descricao da comunidade | `POST` | `/update-community-description` |
| `zapi_create_broadcast` | Criar lista de transmissao | `POST` | `/broadcast` |
| `zapi_update_broadcast` | Atualizar lista de transmissao | `PUT` | `/broadcast/{broadcastId}` |
| `zapi_list_broadcasts` | Listar listas de transmissao | `GET` | `/broadcast` |
| `zapi_delete_broadcast` | Excluir lista de transmissao | `DELETE` | `/broadcast/{broadcastId}` |

</details>

<details>
<summary><strong>Canais, chamadas e Meta AI</strong> — 23 tools (<code>canais</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_create_newsletter` | Criar canal | `POST` | `/create-newsletter` |
| `zapi_update_newsletter_picture` | Atualizar imagem do canal | `POST` | `/update-newsletter-picture` |
| `zapi_update_newsletter_name` | Atualizar nome do canal | `POST` | `/update-newsletter-name` |
| `zapi_update_newsletter_description` | Atualizar descricao do canal | `POST` | `/update-newsletter-description` |
| `zapi_follow_newsletter` | Seguir canal | `PUT` | `/follow-newsletter` |
| `zapi_unfollow_newsletter` | Deixar de seguir canal | `PUT` | `/unfollow-newsletter` |
| `zapi_mute_newsletter` | Silenciar canal | `PUT` | `/mute-newsletter` |
| `zapi_unmute_newsletter` | Reativar notificacoes do canal | `PUT` | `/unmute-newsletter` |
| `zapi_delete_newsletter` | Excluir canal | `DELETE` | `/delete-newsletter` |
| `zapi_get_newsletter_metadata` | Metadados do canal | `GET` | `/newsletter/metadata/{newsletterId}` |
| `zapi_get_newsletter_subscribers` | Inscritos do canal | `GET` | `/newsletter/subscribers/{newsletterId}` |
| `zapi_list_newsletters` | Listar canais | `GET` | `/newsletter` |
| `zapi_search_newsletter` | Pesquisar canais | `POST` | `/search-newsletter` |
| `zapi_update_newsletter_config` | Configurar reacoes do canal | `POST` | `/newsletter/settings/{newsletterId}` |
| `zapi_accept_newsletter_admin_invite` | Aceitar convite de admin do canal | `POST` | `/newsletter/accept-admin-invite/{newsletterId}` |
| `zapi_remove_newsletter_admin` | Remover admin do canal | `POST` | `/newsletter/remove-admin/{newsletterId}` |
| `zapi_revoke_newsletter_admin_invite` | Revogar convite de admin do canal | `POST` | `/newsletter/revoke-admin-invite/{newsletterId}` |
| `zapi_transfer_newsletter_ownership` | Transferir propriedade do canal | `POST` | `/newsletter/transfer-ownership/{newsletterId}` |
| `zapi_send_call` | Realizar chamada | `POST` | `/send-call` |
| `zapi_get_call_token` | Obter token de chamada | `GET` | `/call-token` |
| `zapi_create_sip_token` | Gerar credenciais SIP | `POST` | `/sip-token` |
| `zapi_get_sip_info` | Consultar informacoes SIP | `GET` | `/sip-info` |
| `zapi_send_meta_ai_message` | Conversar com a Meta AI | `POST` | `/send-text` |

</details>

<details>
<summary><strong>Status (stories)</strong> — 6 tools (<code>status</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_send_text_status` | Publicar status de texto | `POST` | `/send-text-status` |
| `zapi_send_image_status` | Publicar status de imagem | `POST` | `/send-image-status` |
| `zapi_send_video_status` | Publicar status de video | `POST` | `/send-video-status` |
| `zapi_reply_status_text` | Responder status com texto | `POST` | `/reply-status-text` |
| `zapi_reply_status_gif` | Responder status com GIF | `POST` | `/reply-status-gif` |
| `zapi_reply_status_sticker` | Responder status com sticker | `POST` | `/reply-status-sticker` |

</details>

<details>
<summary><strong>Catálogo business</strong> — 15 tools (<code>catalogo-business</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_save_product` | Salvar produto no catalogo | `POST` | `/products` |
| `zapi_get_products` | Listar produtos do catalogo | `GET` | `/catalogs` |
| `zapi_get_products_v2` | Listar produtos do catalogo (cursor no body) | `POST` | `/catalogs` |
| `zapi_get_products_by_phone` | Listar catalogo de outro numero | `GET` | `/catalogs/{phone}` |
| `zapi_get_products_by_phone_v2` | Listar catalogo de outro numero (cursor no body) | `POST` | `/catalogs/{phone}` |
| `zapi_get_product` | Detalhar produto do catalogo | `GET` | `/products/{productId}` |
| `zapi_delete_product` | Excluir produto do catalogo | `DELETE` | `/products/{productId}` |
| `zapi_save_catalog_config` | Configurar carrinho do catalogo | `POST` | `/catalogs/config` |
| `zapi_create_collection` | Criar colecao de produtos | `POST` | `/catalogs/collection` |
| `zapi_list_collections` | Listar colecoes do catalogo | `GET` | `/catalogs/collection` |
| `zapi_delete_collection` | Excluir colecao do catalogo | `DELETE` | `/catalogs/collection/{collectionId}` |
| `zapi_edit_collection` | Renomear colecao do catalogo | `POST` | `/catalogs/collection-edit/{collectionId}` |
| `zapi_list_collection_products` | Listar produtos de uma colecao | `GET` | `/catalogs/collection-products/{phone}` |
| `zapi_add_product_to_collection` | Adicionar produtos a uma colecao | `POST` | `/catalogs/collection/add-product` |
| `zapi_remove_product_from_collection` | Remover produtos de uma colecao | `POST` | `/catalogs/collection/remove-product` |

</details>

<details>
<summary><strong>Perfil business e etiquetas</strong> — 16 tools (<code>perfil-business</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_get_business_profile` | Consultar perfil business | `GET` | `/business/profile` |
| `zapi_set_company_description` | Definir descricao da empresa | `POST` | `/business/company-description` |
| `zapi_set_company_email` | Definir e-mail da empresa | `POST` | `/business/company-email` |
| `zapi_set_company_address` | Definir endereco da empresa | `POST` | `/business/company-address` |
| `zapi_set_company_websites` | Definir websites da empresa | `POST` | `/business/company-websites` |
| `zapi_set_business_hours` | Definir horario de funcionamento | `POST` | `/business/hours` |
| `zapi_get_available_categories` | Listar categorias disponiveis | `GET` | `/business/available-categories` |
| `zapi_set_company_categories` | Definir categorias da empresa | `POST` | `/business/categories` |
| `zapi_get_tags` | Listar etiquetas | `GET` | `/tags` |
| `zapi_get_tag_colors` | Listar cores de etiqueta | `GET` | `/business/tags/colors` |
| `zapi_create_tag` | Criar etiqueta | `POST` | `/business/create-tag` |
| `zapi_edit_tag` | Editar etiqueta | `POST` | `/business/edit-tag/{tagId}` |
| `zapi_delete_tag` | Excluir etiqueta | `DELETE` | `/business/tag/{tagId}` |
| `zapi_add_tag_to_chat` | Aplicar etiqueta a conversa | `PUT` | `/chats/{phone}/tags/{tag}/add` |
| `zapi_remove_tag_from_chat` | Remover etiqueta de conversa | `PUT` | `/chats/{phone}/tags/{tag}/remove` |
| `zapi_set_chat_notes` | Definir anotacoes da conversa | `POST` | `/chats/{phone}/notes` |

</details>

<details>
<summary><strong>Webhooks e fila</strong> — 14 tools (<code>webhooks</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_set_webhook_received` | Configurar webhook ao receber mensagem | `PUT` | `/update-webhook-received` |
| `zapi_set_webhook_delivery` | Configurar webhook ao enviar mensagem | `PUT` | `/update-webhook-delivery` |
| `zapi_set_webhook_disconnected` | Configurar webhook de desconexão | `PUT` | `/update-webhook-disconnected` |
| `zapi_set_webhook_message_status` | Configurar webhook de status da mensagem | `PUT` | `/update-webhook-message-status` |
| `zapi_set_webhook_chat_presence` | Configurar webhook de presença do chat | `PUT` | `/update-webhook-chat-presence` |
| `zapi_set_webhook_connected` | Configurar webhook de conexão | `PUT` | `/update-webhook-connected` |
| `zapi_set_all_webhooks` | Configurar todos os webhooks de uma vez | `PUT` | `/update-every-webhooks` |
| `zapi_set_notify_sent_by_me` | Notificar mensagens enviadas por mim | `PUT` | `/update-notify-sent-by-me` |
| `zapi_set_webhook_filters` | Configurar filtros dos webhooks | `PUT` | `/update-filters` |
| `zapi_get_queue` | Listar fila de mensagens | `POST` | `/queue` |
| `zapi_get_queue_legacy` | Listar fila de mensagens (depreciado) | `GET` | `/queue` |
| `zapi_clear_queue` | Limpar fila de mensagens | `DELETE` | `/queue` |
| `zapi_delete_queue_message` | Remover mensagem da fila | `DELETE` | `/queue/{zaapId}` |
| `zapi_update_queue_settings` | Configurar enfileiramento da fila | `PUT` | `/update-queue-settings` |

</details>

<details>
<summary><strong>Privacidade</strong> — 8 tools (<code>privacidade</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_get_disallowed_contacts` | Listar contatos da blacklist de privacidade | `GET` | `/privacy/disallowed-contacts` |
| `zapi_set_last_seen` | Definir quem ve o visto por ultimo | `POST` | `/privacy/last-seen` |
| `zapi_set_photo_visualization` | Definir quem ve a foto de perfil | `POST` | `/privacy/photo-visualization` |
| `zapi_set_privacy_description` | Definir quem ve o recado do perfil | `POST` | `/privacy/description` |
| `zapi_set_group_add_permission` | Definir quem pode te adicionar em grupos | `POST` | `/privacy/group-add` |
| `zapi_set_privacy_online` | Definir quem ve quando voce esta online | `POST` | `/privacy/online` |
| `zapi_set_read_receipts` | Ativar ou desativar confirmacao de leitura | `POST` | `/privacy/read-receipts` |
| `zapi_set_messages_duration` | Definir duracao das mensagens temporarias | `POST` | `/privacy/messages-duration` |

</details>

<details>
<summary><strong>Mobile e segurança</strong> — 15 tools (<code>mobile-seguranca</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_mobile_registration_available` | Verificar disponibilidade do numero | `POST` | `/mobile/registration-available` |
| `zapi_mobile_request_registration_code` | Solicitar codigo de registro | `POST` | `/mobile/request-registration-code` |
| `zapi_mobile_confirm_registration_code` | Confirmar codigo de registro | `POST` | `/mobile/confirm-registration-code` |
| `zapi_mobile_respond_captcha` | Responder captcha do registro | `POST` | `/mobile/respond-captcha` |
| `zapi_mobile_confirm_pin_code` | Confirmar PIN de duas etapas | `POST` | `/mobile/confirm-pin-code` |
| `zapi_mobile_recovery_pin_code` | Recuperar PIN de duas etapas | `POST` | `/mobile/recovery-pin-code` |
| `zapi_mobile_request_unbanning` | Solicitar desbanimento do numero | `POST` | `/mobile/request-unbanning` |
| `zapi_mobile_device_transfer_confirmed` | Confirmar transferencia no celular | `GET` | `/mobile/device-transfer-confirmed` |
| `zapi_get_security_email` | Consultar email de recuperacao | `GET` | `/security/email` |
| `zapi_set_security_email` | Cadastrar email de recuperacao | `POST` | `/security/email` |
| `zapi_verify_security_email` | Verificar email de recuperacao | `POST` | `/security/verify-email` |
| `zapi_remove_security_email` | Remover email de recuperacao | `POST` | `/security/email/remove` |
| `zapi_get_two_fa_status` | Verificar PIN de duas etapas | `GET` | `/security/two-fa-code` |
| `zapi_set_two_fa_code` | Cadastrar PIN de duas etapas | `POST` | `/security/two-fa-code` |
| `zapi_remove_two_fa_code` | Remover PIN de duas etapas | `POST` | `/security/two-fa-code/remove` |

</details>

<details>
<summary><strong>Parceiro / integrador</strong> — 9 tools (<code>parceiro</code>)</summary>

| Tool | O que faz | Método | Path |
|---|---|---|---|
| `zapi_partner_create_instance` | Criar instancia (parceiro) | `POST` | `/instances/integrator/on-demand` |
| `zapi_partner_list_instances` | Listar instancias (parceiro) | `GET` | `/instances` |
| `zapi_partner_update_instance` | Atualizar assinatura da instancia (parceiro) | `PUT` | `/integrator/subscription/update` |
| `zapi_partner_unsubscribe_instance` | Cancelar assinatura da instancia (parceiro) | `POST` | `/integrator/on-demand/cancel` |
| `zapi_partner_sign_instance` | Assinar instancia (parceiro) | `POST` | `/integrator/on-demand/subscription` |
| `zapi_partner_configure_proxy` | Configurar proxy da instancia (parceiro) | `PUT` | `/integrator/configure-proxy` |
| `zapi_partner_update_proxy_webhook` | Definir webhook de falha do proxy (parceiro) | `PUT` | `/update-proxy-webhook` |
| `zapi_partner_get_extension_token` | Gerar token da extensao (parceiro) | `GET` | `/extension-token` |
| `zapi_partner_get_sdk_connector_token` | Gerar token do SDK de conexao (parceiro) | `GET` | `/sdk-connector-token` |

</details>

### Observações sobre os paths

Alguns paths **não correspondem** ao nome da página na documentação da Z-API. Os deste projeto foram extraídos
da listagem de endpoints da API, não dos slugs das páginas. Exemplos:

- `send-message-image` → `POST /send-image`
- `delete-message` → `DELETE /messages` (parâmetros na query)
- `accept-group-invite` → `GET /accept-invite-group`
- `delete-tag` → `DELETE /business/tag/{tagId}` (singular)
- `rename-instance` → `PUT /update-name`
- Responder, mencionar e editar mensagem **não têm endpoint próprio**: usam `POST /send-text` com atributos
  diferentes no corpo (o mesmo vale para as menções em grupo e a mensagem para a Meta AI)
- Arquivar, fixar, silenciar, limpar e apagar chat usam todos `POST /modify-chat`, variando só `action`

A confirmar em produção: a documentação de `mobile/device-transfer-confirmed` mostra **POST**, enquanto a listagem
de endpoints registra **GET**. O projeto segue a listagem (GET).

---

## Endpoints do próprio servidor

Além das tools, o servidor expõe estas rotas HTTP:

| Rota | Para que serve |
|---|---|
| `/api/mcp` (atalho `/mcp`) | Endpoint MCP — Streamable HTTP, exige Bearer token |
| `/.well-known/oauth-protected-resource` | RFC 9728 — metadados do recurso protegido |
| `/.well-known/oauth-authorization-server` | RFC 8414 — metadados do servidor de autorização |
| `/oauth/register` | RFC 7591 — registro dinâmico de clientes |
| `/oauth/authorize` | Tela de login + emissão do authorization code (PKCE S256) |
| `/oauth/token` | Troca de `authorization_code` e `refresh_token` |
| `/api/zapi/delivery` | Receptor de webhook "ao enviar" da Z-API — responde 200 e descarta o conteúdo |
| `/` | Página informativa com a contagem de tools |

> [!NOTE]
> **Editar mensagens** (`editMessageId` em `zapi_send_text`) só funciona se a instância tiver um webhook de envio
> configurado — sem ele a Z-API ignora o campo e cria uma mensagem nova. Se você não usa webhooks, aponte o de
> envio para o receptor embutido com a tool `zapi_set_webhook_delivery`:
> `https://SEU-DOMINIO.vercel.app/api/zapi/delivery`. Ele não lê, grava nem registra o conteúdo recebido.

---

## Deploy na Vercel

Pré-requisitos: conta na [Z-API](https://z-api.io) com uma instância criada e conta na [Vercel](https://vercel.com).

```bash
npm i -g vercel        # se ainda não tiver
vercel link
vercel deploy --prod
```

Depois configure as variáveis de ambiente (veja [`.env.example`](.env.example)):

```bash
vercel env add ZAPI_INSTANCE_ID production
vercel env add ZAPI_INSTANCE_TOKEN production
vercel env add ZAPI_CLIENT_TOKEN production
vercel env add OAUTH_JWT_SECRET production      # openssl rand -hex 32
vercel env add OAUTH_LOGIN_PASSWORD production
vercel deploy --prod                            # redeploy para aplicar
```

### Variáveis obrigatórias

| Variável | Onde encontrar |
|---|---|
| `ZAPI_INSTANCE_ID` | Painel Z-API → card da instância |
| `ZAPI_INSTANCE_TOKEN` | Painel Z-API → card da instância |
| `ZAPI_CLIENT_TOKEN` | Painel Z-API → Segurança → *Token de segurança da conta* (header `Client-Token`) |
| `OAUTH_JWT_SECRET` | Gere você: `openssl rand -hex 32` (mínimo 32 caracteres) |
| `OAUTH_LOGIN_PASSWORD` | Senha que você usará na tela de autorização — use uma senha longa e aleatória |

### Variáveis opcionais

| Variável | Uso |
|---|---|
| `OAUTH_LOGIN_USERNAME` | Usuário da tela de login (padrão `admin`) |
| `OAUTH_ISSUER` | URL pública do servidor, se usar domínio customizado |
| `ZAPI_BASE_URL` | Host da API (padrão `https://api.z-api.io`) |
| `ZAPI_PARTNER_TOKEN` | Token de parceiro, necessário só para as tools `zapi_partner_*` |
| `ZAPI_INSTANCES` | Instâncias adicionais em JSON — veja [Múltiplas instâncias](#múltiplas-instâncias) |
| `ZAPI_TOOL_GROUPS` | Lista de grupos de tools a expor, separados por vírgula |
| `MCP_DISABLE_AUTH` | `true` desliga o OAuth — **apenas para desenvolvimento local** |

---

## Conectar um cliente MCP

### Claude Code

```bash
claude mcp add --transport http zapi https://SEU-DOMINIO.vercel.app/api/mcp
```

O cliente descobre o servidor de autorização sozinho, se registra via Dynamic Client Registration e abre a tela de
login. Autentique com `OAUTH_LOGIN_USERNAME` / `OAUTH_LOGIN_PASSWORD`.

### Outros clientes (Cursor, VS Code, Claude Desktop…)

Aponte para `https://SEU-DOMINIO.vercel.app/api/mcp` como servidor HTTP/Streamable. O fluxo OAuth é automático —
nenhum token precisa ser colado manualmente.

> [!TIP]
> **Muitas tools?** Alguns clientes degradam com mais de ~100 tools. Use `ZAPI_TOOL_GROUPS` para expor só o que
> interessa, por exemplo `ZAPI_TOOL_GROUPS=instancia,mensagens,chats-contatos,grupos`.

---

## Múltiplas instâncias

Configure instâncias adicionais em `ZAPI_INSTANCES` (JSON em uma linha):

```json
{"vendas":{"instanceId":"...","instanceToken":"...","clientToken":"..."},
 "suporte":{"instanceId":"...","instanceToken":"..."}}
```

Qualquer tool aceita então `instanceAlias: "vendas"`. Sem o argumento, usa `ZAPI_INSTANCE_ID` /
`ZAPI_INSTANCE_TOKEN`. Se uma instância não informar `clientToken`, vale o `ZAPI_CLIENT_TOKEN` global.

---

## Segurança e OAuth 2.1

A implementação é **stateless**: não há banco de dados. `client_id`, authorization codes, access tokens e refresh
tokens são JWTs HMAC assinados com `OAUTH_JWT_SECRET`, carregando o próprio estado.

- **PKCE S256 obrigatório** — requisições sem `code_challenge` ou com `plain` são rejeitadas
- **Comparação exata de `redirect_uri`** (sem wildcard ou prefixo), conforme OAuth 2.1
- **Resource Indicators (RFC 8707)** — o `aud` do access token é amarrado a `/api/mcp`; token emitido para outro
  recurso é rejeitado com 401
- **Validade dos tokens:** authorization code 60 s, access token 1 h, refresh token 30 dias
- Cliente público (`token_endpoint_auth_method: none`) — PKCE substitui o client secret
- Refresh **não pode ampliar** o escopo concedido originalmente
- `401` retorna `WWW-Authenticate` com `resource_metadata`, permitindo descoberta automática

> [!IMPORTANT]
> Quem tem acesso ao servidor MCP controla o seu WhatsApp. O registro de clientes é aberto (como a especificação
> MCP pede) e a tela de login não limita tentativas, então **a senha é a sua principal proteção**:
> use um `OAUTH_LOGIN_PASSWORD` longo e aleatório, nunca commite arquivos `.env` e troque o `OAUTH_JWT_SECRET`
> se suspeitar de vazamento — isso invalida todos os tokens emitidos.

---

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local     # preencha as variáveis
npm run dev
```

Para testar sem o fluxo OAuth, adicione `MCP_DISABLE_AUTH=true` ao `.env.local`. **Nunca** use essa variável em
produção.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # build de produção
```

### Estrutura

```
app/
  api/[transport]/route.ts                     handler MCP (Streamable HTTP) + guarda OAuth
  api/well-known/oauth-protected-resource/     RFC 9728
  api/well-known/oauth-authorization-server/   RFC 8414
  api/zapi/delivery/route.ts                   receptor no-op do webhook de envio
  oauth/authorize/route.ts                     tela de login + emissão do code (PKCE)
  oauth/token/route.ts                         troca de code e refresh
  oauth/register/route.ts                      Dynamic Client Registration
  page.tsx                                     página informativa
src/
  lib/env.ts                                   variáveis de ambiente e credenciais
  lib/zapi-client.ts                           cliente HTTP da Z-API (+ API de parceiro)
  lib/tool.ts                                  defineTool e schemas reutilizáveis
  oauth/jwt.ts                                 assinatura/verificação JWT e PKCE S256
  oauth/clients.ts                             DCR stateless e validação de redirect_uri
  oauth/metadata.ts                            metadados de discovery, CORS, erros OAuth
  tools/                                       14 arquivos, um por área da API
  tools/index.ts                               registro, filtro por grupo, checagem de duplicatas
```

### Adicionar uma tool

Siga o padrão de `src/tools/status.ts`:

```ts
defineTool({
  name: 'zapi_exemplo',
  title: 'Exemplo',
  description: 'O que faz. POST /exemplo',
  inputSchema: { phone, texto: z.string().describe('...') },
  handler: (args) => zapiRequest('POST', '/exemplo', { body: toBody(args), instanceAlias: args.instanceAlias }),
})
```

`defineTool` injeta `instanceAlias` automaticamente; `toBody` remove campos `undefined` e o próprio
`instanceAlias` do corpo.

Contribuições são bem-vindas via issues e pull requests. Ao contribuir, você concorda que sua contribuição seja
licenciada sob a mesma licença do projeto.

---

## Licença e créditos

Copyright © 2026 [Pablo Cabral](https://github.com/pablocabralc).

Distribuído sob a **[Apache License 2.0](LICENSE)**. Você pode usar, modificar, distribuir e usar
comercialmente este projeto, **desde que dê os créditos**. Na prática, ao redistribuir o código — original ou
modificado, inclusive como parte de outro produto — você deve:

1. **Manter os créditos:** preservar os avisos de copyright e incluir uma cópia do arquivo [`LICENSE`](LICENSE).
2. **Levar junto o arquivo [`NOTICE`](NOTICE)**, que identifica a autoria e o projeto original.
3. **Indicar o que foi alterado**, se você modificou os arquivos.
4. **Não usar o nome do autor** para sugerir que ele endossa o seu produto.

Sugestão de crédito para colocar no README ou na documentação do seu projeto:

```
Baseado no MCP Z-API de Pablo Cabral — https://github.com/pablocabralc/mcp-zapi (Apache License 2.0)
```

O software é fornecido "no estado em que se encontra", sem garantias de qualquer tipo. Este resumo não substitui
o texto da licença; em caso de dúvida, vale o [`LICENSE`](LICENSE).

---

## Isenção de responsabilidade

- Este projeto **não é oficial** e não tem vínculo com a Z-API, a Meta ou o WhatsApp. É apenas um cliente da API
  pública da Z-API, que também não é uma API oficial do WhatsApp.
- O uso da Z-API exige uma conta própria e é cobrado por ela. Mudanças na API da Z-API podem quebrar tools sem
  aviso.
- Automação de WhatsApp fora da API oficial da Meta pode violar os termos do WhatsApp e levar ao **bloqueio do
  número**. Envio em massa e mensagens não solicitadas aumentam esse risco.
- Você é responsável pelo uso que faz do servidor, pela proteção das suas credenciais e pelo cumprimento da
  legislação aplicável, incluindo a LGPD no tratamento de dados de contatos e mensagens.
