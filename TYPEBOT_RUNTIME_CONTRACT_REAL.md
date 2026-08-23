# Typebot Runtime Contract Real

Status: startChat e escolhas textuais validados; ID/value pendentes
Data: 2026-08-22

## Resumo

A POC foi executada contra `https://viewer.dsilvamoda.cloud` usando exclusivamente `meu-typebot-f362zn4` como `publicId`. O fluxo antigo `inicio-v-1-szfqv6x` nao foi usado nesta rodada.

Nesta rodada foram validados `startChat` e duas execucoes independentes de `continueChat`, uma com `Opção 1` e outra com `Opção 2`.

Nenhuma integracao do Engine foi implementada.

## Atualizacao desta rodada: Typebot de teste

O alvo desta rodada substitui completamente o fluxo antigo:

```text
Viewer: https://viewer.dsilvamoda.cloud
publicId: meu-typebot-f362zn4
```

Foram criadas duas sessoes independentes e executadas estas chamadas:

```text
startChat -> session ovdvyo6aca0k7miomcsjiry9 -> continueChat("Opção 1") -> HTTP 200
startChat -> session b14vef846pva3ajwigv2qtsi -> continueChat("Opção 2") -> HTTP 200
```

O `startChat` retornou `input.type = "choice input"` com as opcoes `Opção 1` e `Opção 2`. Em ambos os casos, o texto visivel enviado em `message.type = "text"` foi aceito e produziu a mensagem correspondente. Nenhum novo `input` foi retornado.

O runtime nao retornou `value` interno para essas opcoes. Portanto, esta rodada confirma somente o texto visivel; ID interno e value continuam sem validacao. Os detalhes completos e a recomendacao para o futuro provider estao em [TYPEBOT_CHOICES_REAL.md](TYPEBOT_CHOICES_REAL.md). As secoes historicas abaixo registram testes anteriores e nao representam o alvo atual.

## Configuracao usada

Os valores sensiveis nao sao registrados neste documento.

- `TYPEBOT_BASE_URL`: `https://viewer.dsilvamoda.cloud`.
- Viewer de teste: `https://viewer.dsilvamoda.cloud`.
- `TYPEBOT_PUBLIC_ID` usado na POC: `meu-typebot-f362zn4`.
- `TYPEBOT_TOKEN`: carregado somente no processo se presente.
- `TYPEBOT_POC_PHONE`: valor padrao `poc-local-user`.
- Bot esperado: fluxo publicado com pergunta de nome, escolha Sim/Nao e escolha Banco A/B/C/D.

## Script executado

```powershell
Push-Location wuzbot-engine
npm run poc:typebot
Pop-Location
```

Runner:

```text
tests/typebot-poc/run.mjs
```

## 1. startChat

### Request real enviado

```http
POST /api/v1/typebots/{publicId}/startChat
Content-Type: application/json
```

O `publicId` foi enviado por URL encoding. O identificador foi omitido aqui para evitar registrar dados de ambiente.

Payload:

```json
{
  "prefilledVariables": {
    "POCPhone": "poc-local-user",
    "POCChannel": "external-http"
  },
  "textBubbleContentFormat": "richText"
}
```

### Response real

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sat, 22 Aug 2026 18:56:10 GMT
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, origin
Access-Control-Allow-Origin:
```

```json
{
  "sessionId": "k2hb6wz07z0o6371m95927k8",
  "resultId": "urtlgxdlr55we7yoi2vwlfst",
  "typebot": {
    "id": "cms74374a00021crqfszfqv6x",
    "version": "6.1",
    "theme": {},
    "settings": {},
    "publishedAt": "2026-08-20T14:38:41.982Z"
  },
  "messages": [
    { "id": "mqdw3fotqg325nbby6u6eo0p", "type": "text", "content": { "type": "richText", "richText": [{ "type": "p", "children": [{ "text": "Olá,  tudo bem?" }] }] } },
    { "id": "e1rmt5du2ivjm8hwqvyvrwlc", "type": "text", "content": { "type": "richText", "richText": [{ "type": "p", "children": [{ "text": "Seu telefone é " }, { "text": "?" }] }] } },
    { "id": "y3jg94ztvfyvpybcez5fn2bi", "type": "text", "content": { "type": "richText", "richText": [{ "type": "p", "children": [{ "text": "Selecione uma opção abaixo:" }] }] } }
  ],
  "input": {
    "id": "we6okxe34kjaiitnzx1zui5l",
    "type": "choice input",
    "items": [
      { "id": "tqe1gvd59svye9qfp1f6qjqt", "outgoingEdgeId": "x2j98kutv5txy5wp904dpfp7", "content": "Relatórios" },
      { "id": "af5knnhm2fioqpujensgb2s6", "outgoingEdgeId": "euw3vkdhwqtaffh57bknji8h", "content": "Registrar" }
    ]
  }
}
```

Captura integral em:

```text
tests/typebot-poc/captures.jsonl
```

Foram obtidos os `sessionId` reais `ovdvyo6aca0k7miomcsjiry9` e `b14vef846pva3ajwigv2qtsi`. O identificador interno retornado foi `cmt4qzvo500011cl6uf362zn4`, com versao `6.1`.

## 2. continueChat

Foram executadas duas chamadas separadas usando o `sessionId` retornado por `startChat`.

Endpoint usado:

```http
POST /api/v1/sessions/{sessionId}/continueChat
```

### Execucao 1: Relatórios

Request real:

```http
POST https://viewer.dsilvamoda.cloud/api/v1/sessions/k2hb6wz07z0o6371m95927k8/continueChat
Content-Type: application/json
```

```json
{
  "message": {
    "type": "text",
    "text": "Relatórios"
  }
}
```

Response real:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sat, 22 Aug 2026 19:03:23 GMT
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, origin
Access-Control-Allow-Origin:
```

```json
{
  "messages": [
    { "id": "w7li7cb7j08aph74wowheyzz", "type": "text", "content": { "type": "richText", "richText": [] } },
    { "id": "emdt6zgpdop2bsj15mxsx51f", "type": "text", "content": { "type": "richText", "richText": [{ "type": "p", "children": [{ "text": "Você sabia que temos um site para conferir os lançamentos?" }] }] } },
    { "id": "af0u01ykmyj018vzxrbz6fx6", "type": "text", "content": { "type": "richText", "richText": [{ "type": "p", "children": [{ "text": "Apenas lembrando: Nem todos tem acesso a plataforma, então não compartilhe com mais ninguém." }] }] } },
    { "id": "t4jyi37fl069m34k5qnnsszr", "type": "embed", "content": { "url": "https://gastos.dsilvamoda.cloud", "waitForEvent": { "isEnabled": false } } }
  ],
  "clientSideActions": [],
  "logs": []
}
```

Valor aceito: o texto visivel `Relatórios`, enviado como `message.type=text`.

Novo input: nenhum campo `input` foi retornado nessa resposta.

### Execucao 2: Registrar

Request real, em uma execucao separada:

```http
POST https://viewer.dsilvamoda.cloud/api/v1/sessions/k2hb6wz07z0o6371m95927k8/continueChat
Content-Type: application/json
```

```json
{
  "message": {
    "type": "text",
    "text": "Registrar"
  }
}
```

Response real:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
Date: Sat, 22 Aug 2026 19:03:33 GMT
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, origin
Access-Control-Allow-Origin:
```

```json
{
  "defined": false,
  "code": "NOT_FOUND",
  "status": 404,
  "message": "Session not found."
}
```

### Conclusao sobre o formato de escolha

O texto visivel `Relatórios` foi aceito pelo Typebot quando enviado como texto. A chamada seguinte com `Registrar` nao testou o valor da opcao nem seu ID, porque a sessao ja nao existia apos o primeiro ramo.

Nesta rodada nao foi possivel confirmar se o runtime aceita, para escolha:

- texto visivel;
- ID da opcao;
- value interno da opcao.

O `startChat` retornou itens com `id` e `content`, mas sem `value` explicito. Para testar ID e value, sera necessario iniciar novas sessoes independentes, uma para cada formato, sem reutilizar uma sessao que ja percorreu o ramo `Relatórios`.

## 3. Recuperacao de sessionId

O `sessionId` foi recuperado de `tests/typebot-poc/session.json` e usado com sucesso na primeira chamada de `continueChat`.

A segunda chamada, feita com o mesmo identificador apos o ramo `Relatórios`, retornou `404 Session not found.`. Portanto, a POC comprovou a leitura e o uso do identificador persistido, mas tambem mostrou que essa sessao nao permaneceu reutilizavel apos a primeira execucao.

## 4. Expiracao de sessao

Nao validada. A expiracao exige uma sessao real e um novo `continueChat` depois do timeout da instancia. O script nao força expiracao artificialmente.

## 5. Texto, botao e lista

O texto visivel `Relatórios` foi validado como entrada aceita pelo Typebot. O retorno desse ramo produziu mensagens de texto e um `embed`, sem novo `input`.

O comportamento especifico de botoes e listas do Wuzapi ainda nao foi validado. Tambem nao foram aceitos/testados o ID da opcao ou um value interno: o `startChat` retornou apenas `id` e `content` para as opcoes.

Os testes planejados pelo runner sao:

```text
continueChat-text-name
continueChat-button
continueChat-list
continueChat-recovered-session
```

## 6. Prefilled variables

O payload foi enviado com:

```json
{
  "POCPhone": "poc-local-user",
  "POCChannel": "external-http"
}
```

O payload de `prefilledVariables` foi aceito junto com `HTTP 200`. O retorno inicial nao expõe diretamente os valores preenchidos. A persistencia dentro do fluxo ainda precisa ser validada por um bloco que mostre essas variaveis ou por uma resposta posterior.

## 7. Midia e upload

Nao validados nesta execucao.

O runner aceita opcionalmente `TYPEBOT_POC_MEDIA_URL` e tenta usar a URL como `attachedFileUrls` em um `continueChat` de texto. Esse caminho so e executado apos um `startChat` bem-sucedido.

O endpoint oficial de upload documentado e:

```http
POST /api/v3/generate-upload-url
```

Ele exige `sessionId`, `blockId`, `fileName` e opcionalmente `fileType`/`fileSize`. Sem uma sessao real, nao foi possivel testar o upload.

## 8. Checagens adicionais da URL

Foram feitos GETs nao destrutivos no host configurado:

| Path | Resultado |
|---|---:|
| `/` | `307` redirect |
| `/api` | `500` |
| `/api/health` | `404` |
| `/health` | `404` |

Esses resultados mostram que o host possui roteamento proprio; a URL publicada do Viewer e a API de chat funcionaram quando o slug correto foi usado.

## 9. Diagnostico

A documentacao oficial para apps externos usa:

```text
POST {viewer-or-runtime-base}/api/v1/typebots/{publicId}/startChat
```

O slug da URL publicada foi usado como `publicId` e retornou `HTTP 200`. Portanto, a relacao esta confirmada:

```text
URL publicada: https://viewer.dsilvamoda.cloud/inicio-v-1-szfqv6x
publicId API:  inicio-v-1-szfqv6x
```

O valor `cms74374a00021crqfszfqv6x` retornado em `typebot.id` e o identificador interno do Typebot. Ele nao substitui o slug publico.

## 10. Proximos testes necessarios

Proximos testes contra o deployment Typebot:

- Executar `continueChat` usando `k2hb6wz07z0o6371m95927k8`.
- Validar resposta de texto, botao e lista.
- Verificar persistencia das `prefilledVariables`.
- Testar reutilizacao do `sessionId` salvo.
- Testar expiracao conforme o timeout real da instancia.
- Testar upload e midia somente depois de identificar o input Typebot compativel.

Para continuar a POC:

```powershell
$env:TYPEBOT_BASE_URL='https://viewer.dsilvamoda.cloud'
$env:TYPEBOT_PUBLIC_ID='inicio-v-1-szfqv6x'
$env:TYPEBOT_POC_START_ONLY='false'
Push-Location wuzbot-engine
npm run poc:typebot
Pop-Location
```

Nao registrar token no relatorio.

## Decisao

A POC deve permanecer bloqueada antes da implementacao real de `TypebotProvider`, `MessageTranslator` e `ConversationEngine`. O `startChat` foi validado; os demais contratos ainda aguardam execucao.
