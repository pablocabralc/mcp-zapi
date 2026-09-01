# MCP Z-API

Servidor **MCP remoto** que expõe a API completa da [Z-API](https://developer.z-api.io) (WhatsApp) como
**217 tools**, pronto para deploy na Vercel e protegido por **OAuth 2.1 com PKCE**.

- Transporte: **Streamable HTTP** em `/api/mcp`
- Autenticação: servidor OAuth 2.1 embutido, **stateless** (sem banco de dados)
- Credenciais Z-API ficam **só no servidor**, em variáveis de ambiente

---

## Tools por área

| Área | Chave (`ZAPI_TOOL_GROUPS`) | Tools |
|---|---|---:|
| Canais (newsletter), chamadas, Meta AI | `canais` | 23 |
| Grupos | `grupos` | 22 |
| Mensagens interativas (botões, listas, carrossel, enquetes, pedidos, eventos) | `mensagens-interativas` | 20 |
| Instância (status, QR code, perfil, conexão) | `instancia` | 20 |
| Mensagens e mídia (texto, imagem, áudio, vídeo, documento, localização…) | `mensagens` | 19 |
| Comunidades e listas de transmissão | `comunidades` | 17 |
| Perfil business e etiquetas | `perfil-business` | 16 |
| Mobile e segurança (registro, 2FA, e-mail de recuperação) | `mobile-seguranca` | 15 |
| Catálogo business (produtos e coleções) | `catalogo-business` | 15 |
| Webhooks e fila | `webhooks` | 14 |
| Chats e contatos | `chats-contatos` | 13 |
| Parceiro / integrador | `parceiro` | 9 |
| Privacidade | `privacidade` | 8 |
| Status / stories | `status` | 6 |
| **Total** | | **217** |

Todas as tools usam o prefixo `zapi_` e aceitam um argumento opcional `instanceAlias` para escolher entre
múltiplas instâncias configuradas.

---

## Deploy na Vercel

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
| `OAUTH_LOGIN_PASSWORD` | Senha que você usará na tela de autorização |

Opcionais: `OAUTH_LOGIN_USERNAME` (padrão `admin`), `ZAPI_BASE_URL`, `ZAPI_PARTNER_TOKEN`, `ZAPI_INSTANCES`,
`ZAPI_TOOL_GROUPS`, `OAUTH_ISSUER`, `MCP_DISABLE_AUTH`.

---

## Conectar um cliente MCP

### Claude Code

```bash
claude mcp add --transport http zapi https://SEU-DOMINIO.vercel.app/api/mcp
```

O cliente descobre o servidor de autorização sozinho, se registra via Dynamic Client Registration e abre a
tela de login. Autentique com `OAUTH_LOGIN_USERNAME` / `OAUTH_LOGIN_PASSWORD`.

### Outros clientes (Cursor, VS Code, Claude Desktop…)

Aponte para `https://SEU-DOMINIO.vercel.app/api/mcp` como servidor HTTP/Streamable. O fluxo OAuth é
automático — nenhum token precisa ser colado manualmente.

> **Muitas tools?** Alguns clientes degradam com mais de ~100 tools. Use `ZAPI_TOOL_GROUPS` para expor só o
> que interessa, por exemplo `ZAPI_TOOL_GROUPS=instancia,mensagens,chats-contatos,grupos`.

---

## Múltiplas instâncias

Configure instâncias adicionais em `ZAPI_INSTANCES` (JSON em uma linha):

```json
{"vendas":{"instanceId":"...","instanceToken":"...","clientToken":"..."},
 "suporte":{"instanceId":"...","instanceToken":"..."}}
```

Qualquer tool aceita então `instanceAlias: "vendas"`. Sem o argumento, usa `ZAPI_INSTANCE_ID`/`ZAPI_INSTANCE_TOKEN`.

---

## OAuth 2.1 — como funciona

Implementação **stateless**: não há banco de dados. `client_id`, authorization codes, access tokens e refresh
tokens são todos JWTs HMAC assinados com `OAUTH_JWT_SECRET`, carregando o próprio estado. Isso faz o servidor
rodar em qualquer function da Vercel sem storage compartilhado.

| Endpoint | Spec |
|---|---|
| `/.well-known/oauth-protected-resource` | RFC 9728 — Protected Resource Metadata |
| `/.well-known/oauth-authorization-server` | RFC 8414 — Authorization Server Metadata |
| `/oauth/register` | RFC 7591 — Dynamic Client Registration |
| `/oauth/authorize` | Authorization Code + **PKCE S256 obrigatório** |
| `/oauth/token` | `authorization_code` e `refresh_token` |

Garantias implementadas:

- **PKCE S256 obrigatório** — requisições sem `code_challenge` ou com `plain` são rejeitadas
- **Comparação exata de `redirect_uri`** (sem wildcard ou prefixo), conforme OAuth 2.1
- **Resource Indicators (RFC 8707)** — o `aud` do access token é amarrado a `/api/mcp`; um token emitido para
  outro recurso é rejeitado com 401
- **Authorization code de 60s**, access token de 1h, refresh token de 30 dias
- Cliente público (`token_endpoint_auth_method: none`) — PKCE substitui o client secret
- Refresh **não pode ampliar** o escopo concedido originalmente
- `401` retorna `WWW-Authenticate` com `resource_metadata`, permitindo descoberta automática

---

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local     # preencha as variáveis
npm run dev
```

Para testar sem o fluxo OAuth, adicione `MCP_DISABLE_AUTH=true` ao `.env.local`.
**Nunca** use essa variável em produção.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # build de produção
```

---

## Estrutura

```
app/
  api/[transport]/route.ts                     handler MCP (Streamable HTTP) + guarda OAuth
  api/well-known/oauth-protected-resource/     RFC 9728
  api/well-known/oauth-authorization-server/   RFC 8414
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

---

## Notas sobre a API da Z-API

Alguns paths **não correspondem** ao nome da página na documentação. Os paths deste projeto foram extraídos da
listagem oficial de endpoints, não dos slugs. Exemplos:

- `send-message-image` → `POST /send-image`
- `delete-message` → `DELETE /messages` (parâmetros na query)
- `accept-group-invite` → `GET /accept-invite-group`
- `delete-tag` → `DELETE /business/tag/{tagId}` (singular)
- `rename-instance` → `PUT /update-name`
- Responder, mencionar e editar mensagem **não têm endpoint próprio**: usam `POST /send-text` com atributos
  diferentes no body
- Arquivar/fixar/silenciar/limpar/apagar chat usam todos `POST /modify-chat`, variando só `action`

Um ponto a confirmar em produção: a documentação de `mobile/device-transfer-confirmed` mostra **POST**,
enquanto a listagem oficial de endpoints registra **GET**. O projeto segue a listagem (GET).
