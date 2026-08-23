# Typebot Integration Specification

Status: descoberta, sem implementacao
Data da analise: 2026-08-22

## 1. Escopo

Este documento registra o contrato oficial encontrado para integrar um cliente externo de mensagens ao Typebot. O cliente externo previsto e o Wuzbot Engine, mas nenhuma integracao real deve ser implementada antes da validacao do ambiente Typebot instalado.

Fonte de verdade consultada:

- [Typebot API authentication](https://docs.typebot.com/api-reference/authentication)
- [Start chat](https://docs.typebot.com/api-reference/chat/start-chat)
- [Continue chat](https://docs.typebot.com/api-reference/chat/continue-chat)
- [Generate upload URL](https://docs.typebot.com/api-reference/chat/generate-upload-url)
- [External messaging apps via HTTP API](https://docs.typebot.com/guides/external-messaging-apps)
- [Webhook block](https://docs.typebot.com/editor/blocks/logic/webhook)
- [File upload block](https://docs.typebot.com/editor/blocks/inputs/file-upload)
- [Variables](https://docs.typebot.com/editor/variables)
- [WhatsApp limitations](https://docs.typebot.com/deploy/whatsapp/overview)
- [Self-hosted configuration](https://docs.typebot.com/self-hosting/configuration)
- [Viewer OpenAPI specification](https://docs.typebot.com/openapi/viewer.json)

Os endpoints abaixo usam a base documentada `https://typebot.io/api`. Em self-hosting, substituir pela URL publica do viewer/runtime, preservando o prefixo `/api` quando aplicavel.

## 2. Conclusao executiva

O caminho suportado para um app externo e:

```text
mensagem externa
  -> startChat na primeira mensagem
  -> persistir sessionId
  -> continueChat nas mensagens seguintes
  -> traduzir messages e input para o canal externo
```

O Typebot continua dono do fluxo, contexto, variaveis e estado. O Engine deve persistir apenas o mapeamento tecnico `telefone -> sessionId`, alem de idempotencia e observabilidade.

A API de chat e sincrona: `startChat` e `continueChat` retornam a resposta no mesmo HTTP response. Nao foi encontrada, na documentacao oficial consultada, uma API generica de callback que substitua esse ciclo para respostas normais do bot.

## 3. Autenticacao

Tokens da API usam:

```http
Authorization: Bearer <TYPEBOT_API_TOKEN>
```

A documentacao informa que endpoints publicos de execucao, incluindo o `startChat` de um bot publicado, nao exigem token. Endpoints autenticados devem usar token criado em `Settings & Members > My account > API tokens`.

Recomendacao para o provider:

- usar token somente no servidor;
- nunca enviar token ao Wuzapi ou ao usuario;
- configurar base URL e token por ambiente;
- tratar `401`, `403`, `404` e `500` como respostas distintas nos logs;
- validar se o viewer self-hosted aceita exatamente o mesmo esquema de autenticacao.

## 4. Iniciar uma sessao

### Endpoint oficial

```http
POST /api/v1/typebots/{publicId}/startChat
Content-Type: application/json
```

O `publicId` e o identificador do bot publicado. A documentacao diferencia `publicId` de `typebotId`: o primeiro e usado para execucao publicada; o segundo e usado no preview/editor.

### Payload minimo

```json
{}
```

### Payload com variaveis iniciais

```json
{
  "prefilledVariables": {
    "Phone": "5511999999999",
    "Channel": "whatsapp"
  },
  "textBubbleContentFormat": "richText"
}
```

Campos documentados relevantes:

- `resultId`: permite sobrescrever um resultado existente, quando aplicavel.
- `message`: resposta inicial, somente quando o fluxo comeca em um input; pode ser texto, audio ou command.
- `isStreamEnabled`: habilita fluxo de streaming de IA e exige tratamento adicional.
- `isOnlyRegistering`: registra a sessao sem iniciar o bot; a documentacao indica esse modo para plataformas de terceiros que precisam registrar a sessao antes da primeira mensagem.
- `prefilledVariables`: valores iniciais das variaveis declaradas no bot.
- `textBubbleContentFormat`: `richText` ou `markdown`.

### Resposta essencial

```json
{
  "sessionId": "session_abc123",
  "resultId": "result_xyz789",
  "lastMessageNewFormat": "...",
  "messages": [
    {
      "id": "bubble_1",
      "type": "text",
      "content": {
        "type": "richText",
        "richText": []
      }
    }
  ],
  "input": {
    "id": "input_1",
    "type": "choice input",
    "items": [
      {
        "id": "item_yes",
        "content": "Sim",
        "value": "yes"
      },
      {
        "id": "item_no",
        "content": "Nao",
        "value": "no"
      }
    ],
    "options": {
      "variableId": "variable_1",
      "isMultipleChoice": false
    }
  },
  "logs": []
}
```

A forma exata de `richText` deve ser tratada conforme o schema retornado pelo runtime. O provider nao deve assumir que todo texto chega como string simples.

## 5. Reutilizar e continuar uma sessao

### Endpoint oficial

```http
POST /api/v1/sessions/{sessionId}/continueChat
Content-Type: application/json
```

### Exemplo documentado para texto

```bash
curl -X POST \
  https://typebot.co/api/v1/sessions/session_abc123/continueChat \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"text","text":"user reply here"}}'
```

A pagina de integracao de apps externos tambem mostra a forma curta conceitual `{"message": "user reply here"}`. O schema OpenAPI atual descreve `message` como objeto discriminado, portanto o provider deve usar a forma tipada e validar contra a versao instalada.

### Texto

```json
{
  "message": {
    "type": "text",
    "text": "Minha resposta"
  }
}
```

O objeto `Text` tambem documenta:

```json
{
  "type": "text",
  "text": "Minha resposta",
  "metadata": {
    "replyId": "item_yes"
  },
  "attachedFileUrls": []
}
```

`attachedFileUrls` so pode ser usado quando o input atual e um text input que permite anexos. `metadata.replyId` aparece no schema e deve ser preservado quando o canal fornecer um identificador de resposta. A semantica exata do `replyId` precisa ser validada em um bot de teste.

### Audio

```json
{
  "message": {
    "type": "audio",
    "url": "https://media.example/audio.ogg"
  }
}
```

Audio so e aceito quando o input atual permite audio clips.

### Command

```json
{
  "message": {
    "type": "command",
    "command": "start"
  }
}
```

### Resposta de continueChat

A resposta retorna principalmente:

```json
{
  "lastMessageNewFormat": "...",
  "messages": [],
  "input": {},
  "clientSideActions": [],
  "logs": [],
  "dynamicTheme": {},
  "progress": 50
}
```

O Engine deve processar `messages` e considerar `input` como a instrução do proximo tipo de resposta que precisa ser coletada. Ele nao deve decidir a transicao do fluxo.

## 6. Enviar variaveis

Nao foi encontrado um endpoint generico separado para alterar variaveis de uma sessao em andamento.

Mecanismos documentados:

1. **Antes da execucao:** `prefilledVariables` no `startChat`.
2. **Durante a conversa:** enviar a resposta ao input atual por `continueChat`; o proprio Typebot salva a resposta na variavel configurada no bloco.
3. **Dentro do fluxo:** usar blocos de input, Set variable, Condition e integracoes do proprio Typebot.
4. **Via URL/embed:** prefilled variables sao suportadas no runtime web, mas isso nao e um contrato adequado para o middleware WhatsApp.

Exemplo inicial:

```json
{
  "prefilledVariables": {
    "External user id": "wa:5511999999999",
    "Phone": "5511999999999"
  }
}
```

Valores de variaveis do Typebot sao essencialmente texto ou lista de textos. Objetos, numeros e booleanos podem ser convertidos; para dados complexos a documentacao recomenda serializar com JSON. O Engine nao deve duplicar nem interpretar essas variaveis.

## 7. Como obter respostas

O resultado de `startChat` e `continueChat` inclui um array `messages`. O OpenAPI documenta, entre outros:

- `text`, com rich text ou markdown;
- `image`, com URL e opcionalmente link;
- `video`, com URL ou provedor;
- `audio`, com URL;
- `embed` e `custom-embed`;
- `clientSideActions`, como espera, redirect, HTTP request, script e stream;
- `input`, descrevendo o proximo input esperado.

Para um canal WhatsApp, o tradutor deve:

- converter texto para mensagem textual;
- converter image/video/audio quando o Wuzapi suportar o formato e a URL for acessivel;
- converter choice input em botoes ou lista do canal;
- ignorar ou reduzir a texto a acoes exclusivas de navegador;
- nunca executar scripts retornados pelo Typebot no Engine.

O provider deve conservar o payload bruto somente em logs tecnicos redigidos e com politica de privacidade; o modelo canonico deve conter apenas os dados necessarios para o adaptador Wuzapi.

## 8. Escolhas, botoes e listas

O Typebot retorna para `choice input` itens com campos como:

```json
{
  "id": "bank_1",
  "content": "Banco A",
  "value": "bank-a"
}
```

O bloco Buttons suporta escolha unica, multipla escolha, itens dinamicos e valor interno. O Engine deve preservar pelo menos:

```text
id
label/content
value
```

Ao receber uma escolha do Wuzapi:

1. usar o ID fornecido pelo canal quando existir;
2. recuperar o valor original associado ao item apresentado;
3. enviar a resposta ao Typebot no contrato confirmado para aquela versao;
4. nao decidir o caminho do fluxo localmente.

A API de chat documentada aceita `Text`, `Audio` ou `Command` como `message`; ela nao apresenta, no schema consultado, um tipo `choice` separado. Portanto, enviar `value`, `content` ou `metadata.replyId` para escolhas e uma decisao que precisa de teste contra o runtime instalado. O provider deve manter essa politica configuravel, e nao codificar uma suposicao definitiva.

### Limites do WhatsApp documentados pelo Typebot

Na integracao oficial WhatsApp do Typebot:

- a API oficial permite no maximo 3 botoes por vez;
- textos de botoes nao podem exceder 20 caracteres e podem ser truncados;
- o Typebot usa mensagens `...` para contornar mais botoes;
- Cards exibem no maximo 3 botoes por card;
- alguns blocos sao incompatveis e sao pulados.

Para Wuzapi, a regra de 3 botoes deve ser tratada como capacidade do canal, nao como regra do Typebot. Quatro ou mais itens devem usar lista se o Wuzapi permitir. Se nao permitir, o fallback deve ser definido pelo adaptador e testado com o bot real.

## 9. Midia e upload

### Entrada de arquivo no Typebot

O bloco File upload possui limite fixo documentado de 10 MB por arquivo. A visibilidade pode ser publica, privada ou automatica. No runtime WhatsApp oficial, a documentacao informa que o arquivo ja esta no servidor do WhatsApp e normalmente nao precisa ser reenviado ao Typebot, salvo quando uma URL publica for necessaria.

### Gerar URL de upload

Quando for realmente necessario enviar um arquivo ao armazenamento do Typebot:

```http
POST /api/v3/generate-upload-url
Content-Type: application/json
```

Payload:

```json
{
  "sessionId": "session_abc123",
  "blockId": "file_input_block",
  "fileName": "comprovante.pdf",
  "fileType": "application/pdf",
  "fileSize": 183421
}
```

Resposta:

```json
{
  "presignedUrl": "https://storage.example/presigned",
  "formData": {
    "key": "...",
    "policy": "..."
  },
  "fileType": "application/pdf",
  "maxFileSize": 10485760,
  "fileUrl": "https://storage.example/file.pdf"
}
```

O upload pode exigir:

- `POST` multipart com `formData` e campo `file`; ou
- `PUT` do arquivo diretamente na `presignedUrl` com `Content-Type`.

O Engine nao deve presumir que uma referencia recebida do Wuzapi pode ser enviada diretamente como `attachedFileUrls`. A URL precisa ser acessivel ao runtime Typebot e o input atual precisa permitir anexos.

### Midia de saida

As mensagens retornadas podem conter URLs de image, video e audio. O Wuzapi precisa conseguir buscar essas URLs ou o Engine precisa fazer uma adaptacao futura. GIF, SVG, formatos de video e limites do Wuzapi devem ser tratados por capacidade declarada do adapter.

## 10. Webhooks

Existem dois conceitos diferentes na documentacao:

### Webhook block do Typebot

O Webhook block pausa a conversa e espera que um servico externo chame o Typebot. A URL de producao documentada tem o formato:

```text
https://typebot.io/api/v1/typebots/{typebotId}/blocks/{blockId}/results/{resultId}/executeWebhook
```

A URL precisa ser autenticada. O `resultId` pode ser obtido no fluxo por uma variavel de sistema.

Esse mecanismo e apropriado quando um fluxo espera uma tarefa externa longa. Ele nao e, por si so, o webhook de entrada de mensagens do Wuzapi nem um callback generico de cada resposta do bot.

### HTTP Request block

O HTTP Request block faz uma chamada imediata a um servico externo e pode salvar dados retornados em variaveis. O timeout documentado padrao e 10 segundos, configuravel no bloco.

### Consequencia para o Engine

O contrato principal deve ser sincrono:

```text
Wuzapi webhook -> Engine -> continueChat -> resposta HTTP -> Wuzapi
```

Um modo callback so deve ser implementado se o runtime instalado fornecer um endpoint oficial adicional ou se o fluxo usar explicitamente o Webhook block. Nao criar um callback Typebot presumido.

## 11. Sessoes persistentes

A documentacao oficial para apps externos e explicita: persistir um `sessionId` por usuario da plataforma externa e reutiliza-lo nas chamadas seguintes.

Persistencia recomendada no Engine:

```text
telefone normalizado
  -> typebot_session_id
```

Metadados tecnicos permitidos:

- provider: `typebot`;
- publicId/typebotId usado;
- status tecnico;
- ultimo contato;
- versao de contrato;
- correlation id;
- timestamps.

Nao persistir no Engine:

- fluxo;
- etapa;
- perguntas;
- respostas completas;
- variaveis;
- contexto;
- historico duplicado.

### Expiracao

A documentacao de apps externos orienta tratar `404` do `continueChat` iniciando uma nova sessao. A documentacao do runtime WhatsApp informa que a sessao pode expirar por inatividade, com configuracao de 0 a 48 horas e padrao de 4 horas na integracao nativa.

Isso cria uma decisao de produto para o Wuzbot Engine:

- `404` pode significar sessao expirada, inexistente ou outro problema de identificador;
- criar uma sessao nova pode perder a continuidade esperada pelo usuario;
- o Engine deve registrar o evento, marcar o vinculo como expirado e aplicar politica explicita de recuperacao;
- a politica inicial recomendada e informar o usuario e reiniciar somente quando a sessao antiga estiver definitivamente indisponivel;
- nunca sobrescrever uma sessao valida silenciosamente.

A configuracao real de expiracao depende do Typebot self-hosted/runtime instalado e deve ser verificada operacionalmente.

### Atualizacao do bot em sessao

Para atualizar uma sessao existente com a versao mais recente do Typebot:

```http
POST /api/v1/sessions/{sessionId}/updateTypebot
Authorization: Bearer <token>
Content-Type: application/json
```

Payload vazio:

```json
{}
```

Resposta de sucesso:

```json
{
  "message": "success"
}
```

Esse endpoint deve ser uma operacao administrativa/configuravel, nao uma acao automatica a cada mensagem sem avaliar compatibilidade do fluxo.

## 12. Streaming de IA

Se `isStreamEnabled` for usado, o Typebot pode retornar uma acao `stream` e exigir:

```http
POST /api/v2/sessions/{sessionId}/streamMessage
```

A resposta usa Server-Sent Events. Depois, a mensagem transmitida deve ser enviada em um `continueChat`.

Fora do escopo inicial do Wuzbot Engine. O provider deve rejeitar ou degradar essa capacidade de forma explicita, nunca descartar silenciosamente uma resposta parcial.

## 13. Tratamento de erros

Contratos HTTP documentados incluem `400`, `401`, `403`, `404` e `500`. O Engine deve classificar:

- `400`: payload ou estado de input invalido; nao repetir cegamente;
- `401/403`: configuracao ou autorizacao; alertar operador e nao criar sessao;
- `404` em `continueChat`: possivel expiracao; aplicar politica de recuperacao;
- `500`: falha do provider; retry limitado com backoff;
- timeout: tratar como indisponibilidade sem apagar o mapeamento.

Mensagem ao usuario em indisponibilidade:

```text
Sistema temporariamente indisponivel. Tente novamente em alguns minutos.
```

O Engine deve garantir idempotencia no webhook Wuzapi e lock por telefone. A API Typebot nao documenta idempotency key nos endpoints de chat consultados; essa protecao precisa existir no Engine e no adaptador de envio para evitar duplicar processamento/reenvio.

## 14. Arquitetura recomendada apos a descoberta

```text
Wuzapi webhook
  -> normalizador canonico
  -> idempotencia e lock
  -> lookup telefone/sessionId
  -> startChat ou continueChat
  -> parser de messages/input
  -> tradutor de capacidade
  -> Wuzapi
```

Interfaces futuras:

```text
ConversationProvider
  startSession(input): Promise<ConversationResult>
  continueSession(sessionId, input): Promise<ConversationResult>
  updateSession?(sessionId): Promise<void>
  generateUploadUrl?(input): Promise<UploadContract>

SessionLinkStore
  findByPhone(phone)
  saveLink(phone, sessionId, metadata)
  markExpired(phone)

MessageTranslator
  fromProvider(response): CanonicalOutput[]
  toProvider(input, currentInput): ProviderMessage
```

O `ConversationProvider` nao deve expor tipos Typebot ao Engine. O `TypebotProvider` e o unico ponto que conhece os paths, nomes de campos e peculiaridades documentadas acima.

## 15. Riscos e limitacoes

1. **Versao instalada:** a documentacao atual usa schema OpenAPI 3.1.1 e pode divergir da versao self-hosted.
2. **Base URL:** builder e viewer sao conceitos distintos no self-hosting; o Engine precisa apontar para o runtime/viewer correto.
3. **Formato de escolha:** o schema de chat documenta Text/Audio/Command como mensagens, mas nao um tipo choice independente.
4. **Expiracao:** o `sessionId` e persistente, mas nao necessariamente eterno.
5. **Midia:** URLs privadas, expiracao de presigned URLs, tamanho e MIME podem impedir o transporte direto.
6. **Acoes de navegador:** scripts, redirects, embeds, pagamentos e analytics nao possuem equivalencia geral no WhatsApp.
7. **Ordem:** respostas consecutivas e mensagens concorrentes precisam de fila/lock por telefone.
8. **Rate limits:** a documentacao recomenda enfileirar respostas quando o bot produz varias bolhas.
9. **Webhooks:** o Webhook block nao deve ser confundido com o endpoint de entrada do Wuzapi.
10. **Seguranca:** payloads e URLs de arquivos podem conter dados pessoais e nao devem aparecer em logs sem redacao.

## 16. Plano de validacao antes do codigo real

1. Confirmar versao exata do Typebot self-hosted e URL do viewer.
2. Criar um bot de teste publicado com texto, escolha unica, escolha multipla, texto, audio e file input.
3. Executar `startChat` e guardar resposta completa redigida.
4. Executar `continueChat` com texto e verificar a variavel salva.
5. Testar escolha usando `value`, `content` e `metadata.replyId` separadamente.
6. Testar `isOnlyRegistering` seguido de `continueChat`.
7. Testar `prefilledVariables` e tipos aceitos.
8. Testar upload com arquivo pequeno e limite acima de 10 MB.
9. Testar URL privada e publica.
10. Esperar ou simular expiracao e observar o status retornado por `continueChat`.
11. Publicar nova versao e testar `updateTypebot`.
12. Testar mensagens consecutivas e reenvio do mesmo webhook.
13. Registrar contratos reais em fixtures versionadas do provider.

## Decisao

A integracao inicial deve usar `startChat`/`continueChat` com `sessionId` persistido no PostgreSQL tecnico. Variaveis e estado permanecem no Typebot. Webhooks e upload sao capacidades opcionais e condicionais, nao o caminho principal de conversa. Nenhum codigo de integracao deve ser implementado antes da validacao contra a instancia Typebot que sera usada em producao.
