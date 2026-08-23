# Typebot Choices Real

Status: texto visivel validado; ID/value pendentes
Data da captura: 2026-08-22

## Alvo

```text
Viewer: https://viewer.dsilvamoda.cloud
publicId: meu-typebot-f362zn4
```

O endpoint usado foi:

```http
POST https://viewer.dsilvamoda.cloud/api/v1/typebots/meu-typebot-f362zn4/startChat
POST https://viewer.dsilvamoda.cloud/api/v1/sessions/{sessionId}/continueChat
```

A API retornou Typebot interno `cmt4qzvo500011cl6uf362zn4`, versao `6.1`.

## Payload de entrada do startChat

Foram abertas duas sessoes independentes. O payload usado em cada uma foi:

```json
{
  "prefilledVariables": {
    "POCChoice": "Opção 1",
    "POCChannel": "external-http"
  },
  "textBubbleContentFormat": "richText"
}
```

Na segunda sessao, `POCChoice` foi `Opção 2`. O campo serve apenas para registrar a variacao do teste; a selecao foi enviada depois pelo `continueChat`.

## Input retornado pelo Typebot

O `startChat` retornou:

```json
{
  "input": {
    "id": "s9f498hplthikczdmuzqgmun",
    "type": "choice input",
    "items": [
      {
        "id": "k88taosrabnu2vduaao4u25x",
        "outgoingEdgeId": "hibqrvwtby81p98qyilvdpiz",
        "content": "Opção 1"
      },
      {
        "id": "kkztwt9ce44y1onm2x8ee9en",
        "outgoingEdgeId": "iauvh55zp60gsn8hw9lzybco",
        "content": "Opção 2"
      }
    ]
  }
}
```

Observacao: nesse retorno nao apareceu um campo `value` para os itens. Os dados observados foram `id`, `outgoingEdgeId` e `content`.

## Escolha Opção 1

### Request real

```http
POST https://viewer.dsilvamoda.cloud/api/v1/sessions/ovdvyo6aca0k7miomcsjiry9/continueChat
Content-Type: application/json
```

```json
{
  "message": {
    "type": "text",
    "text": "Opção 1"
  }
}
```

### Response real

```http
HTTP 200 OK
Content-Type: application/json
Date: Sat, 22 Aug 2026 19:10:06 GMT
```

```json
{
  "messages": [
    {
      "id": "ai8wirewj0tzs7wmwzrb8rhy",
      "type": "text",
      "content": {
        "type": "richText",
        "richText": [
          {
            "type": "p",
            "children": [
              { "text": "Você selecionou a opção 1" }
            ]
          }
        ]
      }
    }
  ],
  "clientSideActions": [],
  "logs": []
}
```

Novo `input`: nao retornado.

## Escolha Opção 2

A segunda escolha foi testada em uma nova sessao, conforme solicitado.

### Request real

```http
POST https://viewer.dsilvamoda.cloud/api/v1/sessions/b14vef846pva3ajwigv2qtsi/continueChat
Content-Type: application/json
```

```json
{
  "message": {
    "type": "text",
    "text": "Opção 2"
  }
}
```

### Response real

```http
HTTP 200 OK
Content-Type: application/json
Date: Sat, 22 Aug 2026 19:10:06 GMT
```

```json
{
  "messages": [
    {
      "id": "ld4fllnqgqe7zi4xcog79f27",
      "type": "text",
      "content": {
        "type": "richText",
        "richText": [
          {
            "type": "p",
            "children": [
              { "text": "Você selecionou a opção 2" }
            ]
          }
        ]
      }
    }
  ],
  "clientSideActions": [],
  "logs": []
}
```

Novo `input`: nao retornado.

## Comparacao

| Teste | Sessao nova | Entrada enviada | HTTP | Resposta observada | Novo input |
|---|---|---|---:|---|---|
| Opção 1 | Sim | texto visivel `Opção 1` | 200 | `Você selecionou a opção 1` | Nao |
| Opção 2 | Sim | texto visivel `Opção 2` | 200 | `Você selecionou a opção 2` | Nao |

## O que foi validado

Foi validado que o runtime aceita o texto visivel da opcao como:

```json
{
  "message": {
    "type": "text",
    "text": "Opção 1"
  }
}
```

E, em uma sessao independente:

```json
{
  "message": {
    "type": "text",
    "text": "Opção 2"
  }
}
```

A resposta diferente para cada texto mostra que o fluxo identificou corretamente as duas escolhas.

## O que nao foi validado

Nao foram enviados nem comparados, neste teste:

- ID interno `k88taosrabnu2vduaao4u25x` ou `kkztwt9ce44y1onm2x8ee9en`;
- `outgoingEdgeId`;
- `value` interno, pois o runtime nao retornou esse campo;
- um payload de escolha estruturado diferente de `message.type=text`.

Portanto, nao e correto concluir que ID ou value sao aceitos. O unico formato confirmado e o texto visivel.

## Formato recomendado para o futuro TypebotProvider

Para a versao e fluxo testados, o provider deve inicialmente enviar a escolha como texto visivel:

```json
{
  "message": {
    "type": "text",
    "text": "<content da opcao retornada pelo Typebot>"
  }
}
```

O provider deve manter o `id` e `content` da opcao no modelo interno para rastreabilidade, mas nao deve enviar `id` ou `value` no payload Typebot sem uma nova prova de conceito que valide esse formato.

A estrategia de envio deve ser configuravel, porque outro fluxo ou versao pode expor/aceitar um contrato diferente.

## Capturas integrais

As quatro capturas JSONL estao em:

```text
tests/typebot-poc/captures.jsonl
```

Elas contem request, URL, headers sem segredo, status, headers de resposta, response body e timestamp.
