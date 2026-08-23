# Translation Matrix

Status: matriz baseada nos contratos Typebot e Wuzapi disponíveis
Data: 2026-08-22

## Fontes

- Typebot real: [TYPEBOT_RUNTIME_CONTRACT_REAL.md](TYPEBOT_RUNTIME_CONTRACT_REAL.md)
- Escolhas Typebot: [TYPEBOT_CHOICES_REAL.md](TYPEBOT_CHOICES_REAL.md)
- Wuzapi runtime: [WUZAPI_RUNTIME_CONTRACT_REAL.md](WUZAPI_RUNTIME_CONTRACT_REAL.md)

O Typebot foi validado em runtime 6.1. No Wuzapi, `GET /health`, autenticacao por `token`, texto, lista e imagem foram validados em runtime. Recepcao de mensagens, botoes, documento, audio e video continuam sem captura real.

## 1. Resumo de compatibilidade

| Origem Typebot | Modelo de saída | Destino Wuzapi | Status |
|---|---|---|---|
| `text` | texto extraído de `richText` | `POST /chat/send/text` com `Phone` e `Body` | ✅ testado |
| `choice input` até 3 itens | botões | `POST /chat/send/buttons` | ⚠️ endpoint documentado, payload de itens ausente |
| `choice input` 4+ itens | lista | `POST /chat/send/list` | ✅ testado |
| `image` | Base64 PNG/JPEG | `POST /chat/send/image` | ✅ testado |
| `document` | Base64 e nome de arquivo | `POST /chat/send/document` | ⚠️ documentado, não testado |
| `audio` | Base64 Opus/Ogg | `POST /chat/send/audio` | ⚠️ documentado, não testado |
| `video` | Base64 MP4/3GPP | `POST /chat/send/video` | ⚠️ documentado, não testado |
| `sticker` | Base64 WebP/MP4 | `POST /chat/send/sticker` | ⚠️ documentado, não testado |

## 2. Texto

```text
Typebot message.type = text
  -> extrair children[].text do richText
  -> Wuzapi POST /chat/send/text
  -> { Phone, Body }
```

Contrato Wuzapi documentado:

```json
{
  "Phone": "5511999999999",
  "Body": "Olá"
}
```

O Typebot real retorna rich text estruturado, não necessariamente uma string simples. A tradução deve concatenar os nós de texto e definir política para quebras de parágrafo.

## 3. Choice input para botões

```text
Typebot input.type = choice input
  -> options.length <= 3
  -> Wuzapi POST /chat/send/buttons
```

O Typebot real retornou:

```json
{
  "id": "k88taosrabnu2vduaao4u25x",
  "content": "Opção 1"
}
```

O Wuzapi documenta `MessageButtons` com:

```json
{
  "Phone": "5521971532700",
  "Body": "How you doin"
}
```

Problema: o OpenAPI não documenta onde inserir os itens dos botões. Não é permitido definir uma tradução final para quick replies sem captura/validação do Wuzapi.

Mapeamento conceitual pendente:

```text
Typebot content -> texto visível do botão
Typebot id      -> identificador técnico candidato
Typebot value   -> valor candidato, não observado no Typebot real
```

Status: ⚠️ maior risco de compatibilidade; endpoint nao testado.

## 4. Choice input para lista

```text
Typebot input.type = choice input
  -> options.length >= 4
  -> Wuzapi POST /chat/send/list
```

Mapeamento baseado nos schemas publicados:

```text
Phone      <- destinatário WhatsApp
ButtonText <- texto do botão de abertura da lista
Desc       <- descrição
TopText    <- título
FooterText <- rodapé
List[].title <- Typebot item.content
List[].RowId <- Typebot item.id, provisoriamente
List[].desc  <- descrição opcional
```

Payload conceitual:

```json
{
  "Phone": "5511999999999",
  "ButtonText": "Selecionar",
  "Desc": "Escolha uma opção",
  "TopText": "Opções",
  "List": [
    {
      "title": "Opção 1",
      "desc": "",
      "RowId": "k88taosrabnu2vduaao4u25x"
    }
  ]
}
```

O envio desse payload foi testado e retornou `HTTP 200` com `Details: Sent`. O retorno de selecao da lista ainda nao foi capturado.

## 5. Mídia Typebot para Wuzapi

O envio de imagem foi comprovado com Base64 PNG e resposta `HTTP 200`. Documento, audio e video continuam apenas documentados.

### Imagem

```text
Typebot message.type = image
  -> obter URL
  -> baixar com allowlist, timeout, limite e validação MIME
  -> converter para data:image/jpeg;base64,... ou PNG
  -> POST /chat/send/image
```

Wuzapi exige Base64 de PNG/JPEG no campo `Image`.

### Documento

```text
Typebot arquivo
  -> obter bytes
  -> Base64 data:application/octet-stream
  -> POST /chat/send/document
```

Campos necessários: `Phone`, `Document`, `FileName`.

### Áudio

```text
Typebot audio
  -> garantir Opus/Ogg
  -> Base64
  -> POST /chat/send/audio
```

Campos necessários: `Phone`, `Audio`. `MimeType`, `PTT`, `Seconds` e `Waveform` são opcionais segundo o OpenAPI.

### Vídeo

```text
Typebot video
  -> garantir MP4/3GPP H.264/AAC
  -> Base64
  -> POST /chat/send/video
```

Campos necessários: `Phone`, `Video`.

## 6. Wuzapi recebido para Typebot

Payload documentado de mensagem:

```json
{
  "message_id": "3EB0C767D26A1B5F7C83",
  "chat_jid": "5491155553333@s.whatsapp.net",
  "sender_jid": "5491155554444@s.whatsapp.net",
  "timestamp": "2023-12-01T15:30:00Z",
  "message_type": "text",
  "text_content": "Hello, how are you?",
  "media_link": ""
}
```

Matriz de entrada:

| Wuzapi | Modelo Typebot candidato | Status |
|---|---|---|
| `message_type=text` + `text_content` | `{ "type": "text", "text": "..." }` | ⚠️ Wuzapi webhook não testado |
| botão recebido | `{ "type": "text", "text": "label" }` | ❌ payload Wuzapi real não conhecido |
| lista recebida | `{ "type": "text", "text": "title" }` | ❌ payload Wuzapi real não conhecido |
| `image` + `media_link` | input de mídia/referência | ⚠️ webhook não validado |
| `document` + `media_link` | input de mídia/referência | ⚠️ não validado |
| `audio` + `media_link` | mensagem `audio` ou texto de fallback | ⚠️ não validado |
| `video` + `media_link` | mídia ou texto de fallback | ⚠️ não validado |

A API Typebot validada aceitou texto visível para escolhas. Isso não permite concluir como os eventos de botão/lista do Wuzapi chegam ao Engine.

## 7. Autenticação e telefone

Wuzapi exige header:

```http
token: <WUZAPI_USER_TOKEN>
```

O telefone de envio deve usar código do país sem `+`:

```text
5511999999999
```

O Engine deve manter `Phone` e JID separados: `Phone` para envio quando aceito; `chat_jid`/`sender_jid` para correlação de evento quando necessário.

## 8. Fallbacks

Fallbacks permitidos somente após validação do canal:

```text
buttons incompatíveis -> list
list incompatível      -> text numerado
media incompatível     -> texto controlado
richText complexo      -> texto concatenado
```

Nenhum fallback deve esconder erro de contrato. A resposta original e a capacidade rejeitada precisam ser registradas tecnicamente sem dados sensíveis.

## 9. Bloqueios da matriz

1. O payload de itens de `/chat/send/buttons` não está no OpenAPI.
2. O webhook real de entrada não tem schema específico publicado.
3. Não há captura real de botão ou lista no Wuzapi.
4. Não há teste de envio com token e destinatário autorizados.
5. Não há confirmação runtime de limites de listas e mídia.
6. O Typebot retorna `content` e `id` para as escolhas testadas, mas não retornou `value`.
7. Mídia Typebot/Wuzapi usa modelos de armazenamento diferentes: URL no Typebot e Base64 no Wuzapi.

## 10. Decisão atual

Alem da traducao Typebot comprovada, os seguintes envios Wuzapi foram comprovados em runtime: texto, lista e imagem.

A traducao de entrada Typebot comprovada em runtime é:

```text
Typebot choice content
  -> message.type=text
  -> Typebot aceita texto visível
```

Para o Wuzapi, a matriz de recepcao e botoes ainda depende de POC real. O proximo passo nao e corrigir codigo: e obter um webhook de teste separado do n8n atual e capturar eventos reais de texto, lista, imagem, documento, audio e video.
