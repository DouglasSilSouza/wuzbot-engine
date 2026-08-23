# Wuzapi Contract

Status: auditoria documental, sem alteracao de implementacao
Data: 2026-08-22
Versao documentada: Wuzapi 3.0.0 OAS3

## Fonte oficial

- Documentacao: https://wuzapi.dsilvamoda.cloud/api/
- OpenAPI: https://wuzapi.dsilvamoda.cloud/api/spec.yml

A especificacao foi lida diretamente do OpenAPI publicado. Os contratos abaixo sao os documentados pelo servidor Wuzapi; nao foram executadas chamadas de envio, pois nao houve autorizacao/necessidade de enviar mensagens reais durante esta auditoria.

## 1. Base, autenticacao e formato de telefone

A documentacao separa endpoints padrao e administrativos:

- Endpoints padrao usam o header `token` com um token de usuario valido.
- Endpoints administrativos usam o header `Authorization` com o token administrativo configurado em `WUZAPI_ADMIN_TOKEN`.

Exemplo de endpoint padrao:

```http
token: <WUZAPI_USER_TOKEN>
Content-Type: application/json
```

O telefone deve conter codigo do pais, sem o sinal `+`.

Exemplo documentado:

```text
5491155553934
```

O Engine deve normalizar o telefone para esse formato antes de chamar o Wuzapi, mas deve preservar JIDs quando a API exigir um identificador de chat.

## 2. Envio de texto

Endpoint:

```http
POST /chat/send/text
```

Schema: `MessageText`.

Payload documentado:

```json
{
  "Phone": "5491155553935",
  "Body": "How you doin",
  "LinkPreview": true,
  "Id": "ABCDABCD1234",
  "ContextInfo": {
    "StanzaId": "3EB06F9067F80BAB89FF",
    "Participant": "5491155553935@s.whatsapp.net"
  },
  "QuotedText": "Original message text"
}
```

Obrigatórios:

- `Phone`
- `Body`

`Id` é opcional; se omitido, o Wuzapi gera um identificador aleatório. `ContextInfo` é opcional e serve para responder uma mensagem existente. `QuotedText` é opcional para exibir a prévia do texto citado.

Resposta documentada:

```json
{
  "code": 200,
  "data": {
    "Details": "Sent",
    "Id": "90B2F8B13FAC8A9CF6B06E99C7834DC5",
    "Timestamp": "2022-04-20T12:49:08-03:00"
  },
  "success": true
}
```

## 3. Envio de botões

Endpoint:

```http
POST /chat/send/buttons
```

Schema: `MessageButtons`.

Payload documentado:

```json
{
  "Phone": "5521971532700",
  "Body": "How you doin",
  "Id": "ABCDABCD1234",
  "ContextInfo": {
    "StanzaId": "3EB06F9067F80BAB89FF",
    "Participant": "5491155553935@s.whatsapp.net"
  }
}
```

Obrigatórios:

- `Phone`
- `Body`

Limitação crítica: o OpenAPI publicado não documenta, no schema `MessageButtons`, uma propriedade para array de botões, títulos, IDs ou valores. Portanto, a documentação disponível não permite afirmar como esse endpoint cria quick replies. Não se deve inventar campos como `Buttons`, `DisplayText` ou `Type` sem testar a instância ou consultar a implementação específica do Wuzapi.

A resposta documentada é a resposta padrão `code`, `data.Details`, `data.Id`, `data.Timestamp` e `success`.

## 4. Envio de listas

Endpoint:

```http
POST /chat/send/list
```

Schema: `MessageList`.

Payload documentado:

```json
{
  "Phone": "5521971532700",
  "ButtonText": "Click Here",
  "Desc": "This is a list",
  "TopText": "This is a list",
  "FooterText": "This is a footer text",
  "List": [
    {
      "title": "menu button 1",
      "desc": "long description",
      "RowId": "1"
    },
    {
      "title": "menu button 2",
      "desc": "another description",
      "RowId": "2"
    }
  ]
}
```

Obrigatórios:

- `Phone`
- `ButtonText`
- `Desc`
- `TopText`
- `List`

Cada item documentado possui:

- `title`
- `desc`
- `RowId`

O OpenAPI não declara limite de quantidade de itens, tamanho de campos ou número de seções. Esses limites devem ser validados antes de usar listas em produção.

## 5. Envio de imagem

Endpoint:

```http
POST /chat/send/image
```

Schema: `MessageImage`.

Payload documentado:

```json
{
  "Phone": "5491155553935",
  "Image": "data:image/jpeg;base64,iVBORw0",
  "Caption": "Image Description",
  "Id": "ABCDABCD1234"
}
```

Obrigatórios:

- `Phone`
- `Image`

A documentação exige imagem codificada em Base64 nos formatos `image/png` ou `image/jpeg`, normalmente em data URL. `Caption`, `Id` e `ContextInfo` são opcionais.

## 6. Envio de documento

Endpoint:

```http
POST /chat/send/document
```

Schema: `MessageDocument`.

Payload documentado:

```json
{
  "Phone": "5491155553935",
  "Document": "data:application/octet-stream;base64,aG9sYSBxdWUK",
  "FileName": "file.txt",
  "Id": "ABCDABCD1234"
}
```

Obrigatórios:

- `Phone`
- `Document`
- `FileName`

O conteúdo deve ser Base64 com MIME `application/octet-stream`, conforme a descrição oficial.

## 7. Envio de áudio

Endpoint:

```http
POST /chat/send/audio
```

Schema: `MessageAudio`.

Payload documentado:

```json
{
  "Phone": "5491155553935",
  "Audio": "data:audio/ogg;base64,iVBORw0a",
  "Id": "ABCDABCD1234",
  "PTT": true,
  "MimeType": "audio/ogg; codecs=opus",
  "Seconds": 15,
  "Waveform": [0, 0, 0, 12, 20, 20, 22, 10, 5, 0, 0, 0]
}
```

Obrigatórios:

- `Phone`
- `Audio`

A descrição exige áudio Base64 em formato Opus com MIME `audio/ogg`. `PTT`, `MimeType`, `Seconds`, `Waveform`, `Id` e `ContextInfo` são opcionais.

## 8. Envio de vídeo

Endpoint:

```http
POST /chat/send/video
```

Schema: `MessageVideo`.

Payload documentado:

```json
{
  "Phone": "5491155553935",
  "Video": "data:video/mp4;base64,iVBORw0",
  "Caption": "my video",
  "Id": "ABCDABCD1234",
  "JpegThumbnail": "AA00D010"
}
```

Obrigatórios:

- `Phone`
- `Video`

A descrição exige Base64 em `video/mp4` ou `video/3gpp`, com codec de vídeo H.264 e áudio AAC.

## 9. Sticker

Embora não esteja entre os itens obrigatórios desta auditoria, o Wuzapi também documenta:

```http
POST /chat/send/sticker
```

Payload `MessageSticker`:

```json
{
  "Phone": "5491155553935",
  "Sticker": "data:image/webp;base64,iVBORw0",
  "Id": "ABCDABCD1234",
  "PngThumbnail": "AA00D010",
  "MimeType": "image/webp",
  "PackId": "my.sticker.pack.id",
  "PackName": "My Pack",
  "PackPublisher": "Wuzapi"
}
```

A descrição aceita Base64 `image/webp` ou `video/mp4`.

## 10. Webhook de entrada

O Wuzapi configura o webhook do usuário por:

```http
GET    /webhook
POST   /webhook
PUT    /webhook
DELETE /webhook
```

Para configurar:

```http
POST /webhook
```

Payload `WebhookSet`:

```json
{
  "webhook": "https://example.net/webhook",
  "events": ["Message", "ReadReceipt"]
}
```

Obrigatórios:

- `webhook`
- `events`

Eventos documentados:

- `Message`
- `ReadReceipt`
- `Presence`
- `HistorySync`
- `ChatPresence`
- `All`

Resposta documentada:

```json
{
  "code": 200,
  "data": {
    "WebhookURL": "https://example.net/webhook",
    "Events": ["Message", "ReadReceipt"]
  },
  "success": true
}
```

O `PUT /webhook` usa `WebhookUpdate`, com `webhook`, `events` e `Active` opcional.

A documentação informa que o Wuzapi fará POST ao webhook configurado quando mensagens ou eventos forem recebidos. O OpenAPI publicado não apresenta um schema único de request body para esse POST de evento; portanto, o payload abaixo é o schema documentado de mensagem de histórico, não uma captura garantida de webhook em tempo real.

## 11. Estrutura documentada de mensagem recebida

O schema `HistoryMessage` documenta estes campos:

```json
{
  "id": 1,
  "user_id": "abc123def456",
  "chat_jid": "5491155553333@s.whatsapp.net",
  "sender_jid": "5491155554444@s.whatsapp.net",
  "message_id": "3EB0C767D26A1B5F7C83",
  "timestamp": "2023-12-01T15:30:00Z",
  "message_type": "text",
  "text_content": "Hello, how are you?",
  "media_link": ""
}
```

Campos:

- `id`: identificador interno do histórico.
- `user_id`: usuário Wuzapi proprietário da sessão.
- `chat_jid`: JID do chat.
- `sender_jid`: JID de quem enviou.
- `message_id`: ID WhatsApp da mensagem.
- `timestamp`: data/hora.
- `message_type`: tipo da mensagem, como `text`, `image`, `audio`, `video`, `document` ou `sticker`.
- `text_content`: texto ou legenda.
- `media_link`: link de mídia quando aplicável.

O adapter deve aceitar esse formato documentado e preservar o payload bruto para diagnóstico técnico. A estrutura real do webhook precisa ser capturada em uma instância conectada antes de fixar o parser.

## 12. HMAC do webhook

O Wuzapi documenta configuração HMAC por sessão:

```http
POST   /session/hmac/config
GET    /session/hmac/config
DELETE /session/hmac/config
```

A documentação do índice indica HMAC para assinatura do webhook. O Engine deve preferir validação HMAC quando disponível, em vez de depender somente de um segredo estático no header.

O algoritmo, nome do header e formato da assinatura não foram detalhados no material extraído do índice; devem ser confirmados na operação antes da implementação.

## 13. Limites documentados e lacunas

Limites/capacidades explícitas:

- Telefone sem `+` e com código do país.
- Imagem: Base64 PNG ou JPEG.
- Áudio: Base64 Opus em `audio/ogg`.
- Documento: Base64 com `application/octet-stream`.
- Vídeo: Base64 MP4 ou 3GPP, H.264/AAC.
- Sticker: Base64 WebP ou MP4.
- Listas: schema de itens com `title`, `desc`, `RowId`, sem quantidade máxima declarada.
- Botões: schema publicado sem coleção de botões, limite ou estrutura de item.

Lacunas que impedem considerar o contrato completo:

- Payload real do POST de evento no webhook não está definido como schema próprio no OpenAPI.
- Endpoint de botões não documenta os botões dentro de `MessageButtons`.
- Não há limites declarados para listas, textos, mídia ou tamanho Base64.
- Não foi feita validação de envio contra o Wuzapi nesta auditoria.
- Não foi validada a estrutura real de respostas de botão/lista recebidas por webhook.
- HMAC está listado, mas algoritmo/header/formato não foram confirmados.

## 14. Estratégia de tradução recomendada

### Typebot text

```text
Canonical TEXT
  -> POST /chat/send/text
  -> { Phone, Body }
```

### Typebot choice input com até 3 itens

```text
Canonical BUTTONS
  -> POST /chat/send/buttons
```

Mas o payload de itens só deve ser implementado depois de obter o contrato real de botões do Wuzapi, pois o OpenAPI atual não o declara.

### Typebot choice input com 4 ou mais itens

```text
Canonical LIST
  -> POST /chat/send/list
  -> { Phone, ButtonText, Desc, TopText, FooterText, List[] }
```

Mapeamento seguro:

```text
label/content -> List[].title
id            -> List[].RowId
value         -> manter em metadata técnico até o Wuzapi confirmar o retorno
```

### Typebot mídia

- Image -> `/chat/send/image`, convertendo a mídia para Base64 PNG/JPEG.
- Document -> `/chat/send/document`, Base64 e `FileName`.
- Audio -> `/chat/send/audio`, Opus/Ogg.
- Video -> `/chat/send/video`, MP4 H.264/AAC.
- Sticker -> `/chat/send/sticker`, WebP/MP4.

O Engine não deve baixar URLs arbitrárias sem política de allowlist, limite de tamanho, timeout e validação MIME.

### Entrada Wuzapi -> Typebot

Mapeamento inicial:

```text
message_type=text     -> message.type=text, text_content
message_type=image    -> referência media_link
message_type=document -> referência media_link
message_type=audio    -> referência media_link
message_type=video    -> referência media_link
message_type=sticker  -> referência media_link
```

Escolhas recebidas por botão/lista precisam de captura real antes de determinar se o Engine deve usar título, RowId ou outro campo para enviar o texto visível ao Typebot.

## 15. Auditoria do adapter existente

O código atual de `WuzapiAdapter` não está conforme este contrato oficial:

- usa `WUZAPI_SEND_URL` genérico, cujo valor de exemplo é `/api/send`;
- envia `{ to, message }`, enquanto o Wuzapi documenta `Phone`, `Body`, `Image`, `List` etc.;
- reconhece apenas alguns formatos aproximados de webhook;
- não implementa endpoints específicos por tipo;
- não pode implementar botões corretamente com base no OpenAPI atual;
- não foi validado contra a instância real.

Classificação: **implementado sem validação real e incompatível com o contrato oficial em pontos críticos**.

## Decisão da auditoria

Não alterar o adapter nesta fase. O próximo passo correto é uma POC isolada do Wuzapi que:

1. obtenha/configure um usuário de teste;
2. valide header `token`;
3. teste `/chat/send/text`;
4. capture um webhook real;
5. teste lista;
6. esclareça botões;
7. valide mídia;
8. confirme HMAC;
9. registre payloads e respostas reais.
