# Wuzapi Runtime Contract Real

Status: validacao parcial; texto, lista, imagem e configuracao de webhook testados
Data: 2026-08-22
Versao documental: Wuzapi 3.0.0 OAS3

## Escopo e fonte da verdade

Fontes utilizadas exclusivamente:

- https://wuzapi.dsilvamoda.cloud/api/
- https://wuzapi.dsilvamoda.cloud/api/spec.yml

O OpenAPI foi lido diretamente do arquivo `spec.yml`. Foram executados envios reais de texto, lista e imagem usando as credenciais de teste configuradas no `.env.example`. O token nao e registrado neste documento.

## Configuracao encontrada

O arquivo `wuzbot-engine/.env.example` contem a configuracao de teste usada nesta POC:

```text
WUZAPI_URL=http://wuzapi:8080
WUZAPI_USER_TOKEN=[configurado; omitido]
WUZAPI_TEST_PHONE=[configurado; omitido]
```

As credenciais foram carregadas somente no processo da POC e nao foram gravadas nas capturas nem neste documento.

## 1. Healthcheck

### Rota documentada

```http
GET /health
```

### Chamada real

```http
GET https://wuzapi.dsilvamoda.cloud/health
```

### Resultado real

```http
HTTP 200 OK
Content-Type: application/json
```

Corpo observado:

```json
{
  "status": "ok",
  "timestamp": "2026-08-22T19:37:40Z"
}
```

Classificacao: ✅ testado e comprovado.

Observacao: `GET https://wuzapi.dsilvamoda.cloud/api/health` retornou `HTTP 404`. O prefixo `/api/` serve a pagina/documentacao publicada; as rotas operacionais usam a raiz do servidor.

## 2. Autenticacao

Endpoints padrao usam:

```http
token: <WUZAPI_USER_TOKEN>
```

Endpoints administrativos usam:

```http
Authorization: <WUZAPI_ADMIN_TOKEN>
```

A especificacao define `ApiKeyAuth` como API key no header `token` e `AdminAuth` como API key no header `Authorization`.

Classificacao: ✅ testado e comprovado indiretamente nos tres envios reais abaixo: o header `token` foi aceito.

Nao foi feita tentativa com token placeholder.

## 3. Envio de texto

Endpoint documentado:

```http
POST /chat/send/text
```

Schema: `MessageText`.

Payload documentado, nao capturado em runtime:

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

Obrigatorios: `Phone` e `Body`.

Resposta documentada, nao capturada em runtime:

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

### Execucao real

```http
POST https://wuzapi.dsilvamoda.cloud/chat/send/text
Content-Type: application/json
token: [omitido]
```

```json
{
  "Phone": "5511953869941",
  "Body": "Wuzbot Engine POC - texto",
  "Id": "wuzbot-poc-text-1787427990481"
}
```

Resposta real:

```http
HTTP 200 OK
Content-Type: application/json
Request-Id: da4vp5kvku0s739cp6c0
```

```json
{
  "code": 200,
  "data": {
    "Details": "Sent",
    "Id": "wuzbot-poc-text-1787427990481",
    "Timestamp": 1787427990
  },
  "success": true
}
```

Classificacao: ✅ testado e comprovado.

## 4. Envio de imagem

Endpoint documentado:

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

Obrigatorios: `Phone` e `Image`.

A documentacao exige Base64 em PNG ou JPEG.

Resposta documentada: envelope `code`, `data.Details`, `data.Id`, `data.Timestamp` e `success`.

### Execucao real

```http
POST https://wuzapi.dsilvamoda.cloud/chat/send/image
Content-Type: application/json
token: [omitido]
```

```json
{
  "Phone": "5511953869941",
  "Image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "Caption": "Wuzbot Engine POC - imagem",
  "Id": "wuzbot-poc-image-1787427991194"
}
```

Resposta real:

```http
HTTP 200 OK
Content-Type: application/json
Request-Id: da4vp5svku0s739cp6d0
```

```json
{
  "code": 200,
  "data": {
    "Details": "Sent",
    "Id": "wuzbot-poc-image-1787427991194",
    "Timestamp": 1787427991
  },
  "success": true
}
```

Classificacao: ✅ testado e comprovado.

## 5. Envio de documento

Endpoint documentado:

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

Obrigatorios: `Phone`, `Document` e `FileName`.

A documentacao exige conteudo Base64 com MIME `application/octet-stream`.

Classificacao: ⚠️ documentado mas não testado.

## 6. Envio de áudio

Endpoint documentado:

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

Obrigatorios: `Phone` e `Audio`.

A documentacao exige Opus em `audio/ogg`.

Classificacao: ⚠️ documentado mas não testado.

## 7. Envio de vídeo

Endpoint documentado:

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

Obrigatorios: `Phone` e `Video`.

Formatos documentados: MP4 ou 3GPP, com H.264 e AAC.

Classificacao: ⚠️ documentado mas não testado.

## 8. Envio de lista

Endpoint documentado:

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

Obrigatorios: `Phone`, `ButtonText`, `Desc`, `TopText` e `List`.

O OpenAPI nao declara limite de itens, tamanho de texto ou quantidade de secoes.

### Execucao real

```http
POST https://wuzapi.dsilvamoda.cloud/chat/send/list
Content-Type: application/json
token: [omitido]
```

```json
{
  "Phone": "5511953869941",
  "ButtonText": "Selecionar",
  "Desc": "Wuzbot Engine POC",
  "TopText": "Lista de teste",
  "FooterText": "Teste Wuzapi",
  "List": [
    { "title": "Opcao A", "desc": "Primeira opcao", "RowId": "poc-a" },
    { "title": "Opcao B", "desc": "Segunda opcao", "RowId": "poc-b" }
  ]
}
```

Resposta real:

```http
HTTP 200 OK
Content-Type: application/json
Request-Id: da4vp5kvku0s739cp6cg
```

```json
{
  "code": 200,
  "data": {
    "Details": "Sent",
    "Id": "3EB0743F720D1EB3C87242",
    "Timestamp": 1787427991
  },
  "success": true
}
```

Classificacao: ✅ testado e comprovado.

## 9. Envio de botões

Endpoint documentado:

```http
POST /chat/send/buttons
```

Schema: `MessageButtons`.

Payload publicado pelo OpenAPI:

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

Obrigatorios: `Phone` e `Body`.

Achado crítico: o schema `MessageButtons` publicado não contém array de botões, título, texto visível, ID, valor ou tipo de botão. Assim, o contrato oficial disponível não permite construir um payload de botões confiável.

Classificacao: ⚠️ documentado mas não testado.

Nao classificar como ❌ não suportado: o endpoint existe no OpenAPI, mas seu payload publicado é incompleto para o objetivo de quick replies.

## 10. Webhook de entrada

### Configuração

Endpoint documentado:

```http
GET    /webhook
POST   /webhook
PUT    /webhook
DELETE /webhook
```

Configuração inicial:

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

Eventos documentados:

- `Message`
- `ReadReceipt`
- `Presence`
- `HistorySync`
- `ChatPresence`
- `All`

### Configuracao atual real

Consulta realizada sem alterar a configuracao:

```http
GET https://wuzapi.dsilvamoda.cloud/webhook
token: [omitido]
```

Resposta real:

```http
HTTP 200 OK
```

```json
{
  "code": 200,
  "data": {
    "subscribe": ["Message"],
    "webhook": "https://webhook-n8n.dsilvamoda.cloud/webhook/entrada-v2"
  },
  "success": true
}
```

O webhook atual pertence ao n8n e nao foi alterado. Nao houve captura do POST recebido porque isso exigiria modificar a configuracao ou possuir acesso ao endpoint receptor.

Classificacao da configuracao: ✅ testado e comprovado.
Classificacao da estrutura do evento em tempo real: ⚠️ documentado mas não testado.

### Estrutura de mensagem documentada

O schema `HistoryMessage` contém:

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

A especificacao nao publica um schema separado para o POST real de evento no webhook. Portanto, nao foi possível confirmar o payload efetivamente recebido em tempo real.

Classificacao: ⚠️ documentado mas não testado.

## 11. Mídia recebida

A documentação lista `message_type` para:

- `text`
- `image`
- `audio`
- `video`
- `document`
- `sticker`
- `contact`
- `location`

O campo `media_link` é documentado para mensagens de mídia.

Não foi possível validar mensagens reais de imagem, documento, áudio ou vídeo sem um WhatsApp conectado e webhook autorizado.

Classificação por tipo recebido:

| Tipo | Status |
|---|---|
| Texto | ⚠️ documentado mas não testado |
| Botão | ⚠️ documentado mas não testado; schema de entrada não definido |
| Lista | ⚠️ documentado mas não testado; schema de entrada não definido |
| Imagem | ⚠️ documentado mas não testado |
| Documento | ⚠️ documentado mas não testado |
| Áudio | ⚠️ documentado mas não testado |
| Vídeo | ⚠️ documentado mas não testado |

Nenhum tipo foi classificado como ❌ não suportado porque a documentação lista as capacidades; a ausência de teste não equivale a ausência de suporte.

## 12. HMAC

A documentação lista:

```http
POST   /session/hmac/config
GET    /session/hmac/config
DELETE /session/hmac/config
```

A finalidade é configurar assinatura HMAC do webhook. O índice não detalha algoritmo, nome do header ou formato da assinatura.

Classificacao: ⚠️ documentado mas não testado.

## 13. Resumo de classificação

| Recurso | Classificação |
|---|---|
| `GET /health` | ✅ testado e comprovado |
| Autenticação padrão | ✅ testado e comprovado |
| `POST /chat/send/text` | ✅ testado e comprovado |
| `POST /chat/send/image` | ✅ testado e comprovado |
| `POST /chat/send/document` | ⚠️ documentado mas não testado |
| `POST /chat/send/audio` | ⚠️ documentado mas não testado |
| `POST /chat/send/video` | ⚠️ documentado mas não testado |
| `POST /chat/send/list` | ✅ testado e comprovado |
| `POST /chat/send/buttons` | ⚠️ documentado mas não testado; schema incompleto |
| `GET /webhook` | ✅ testado e comprovado |
| POST de evento do webhook | ⚠️ documentado mas não testado; payload real ausente |
| Recepção de texto | ⚠️ documentado mas não testado |
| Recepção de botão | ⚠️ documentado mas não testado |
| Recepção de lista | ⚠️ documentado mas não testado |
| Recepção de imagem | ⚠️ documentado mas não testado |
| Recepção de documento | ⚠️ documentado mas não testado |
| Recepção de áudio | ⚠️ documentado mas não testado |
| Recepção de vídeo | ⚠️ documentado mas não testado |

Nenhum endpoint foi classificado como ❌ não suportado nesta análise documental.

## 14. Conclusão operacional

O Wuzapi está acessível e o healthcheck respondeu corretamente. O contrato documental de envio de mídia e lista existe, mas ainda não foi comprovado em runtime. O maior risco é `/chat/send/buttons`: o endpoint está listado, porém o schema publicado não descreve os botões.

A validação real seguinte exige, dentro de `wuzbot-engine`:

1. token de usuário Wuzapi válido;
2. número de WhatsApp conectado e autorizado;
3. número de destino de teste;
4. endpoint público do webhook do Engine;
5. configuração de `POST /webhook` para evento `Message`;
6. captura de mensagem real de cada tipo;
7. teste controlado de cada endpoint de envio;
8. consulta de HMAC;
9. documentação das respostas reais.

Até essa etapa, não corrigir o `WuzapiAdapter` nem tratar os payloads documentados como contratos runtime comprovados.
