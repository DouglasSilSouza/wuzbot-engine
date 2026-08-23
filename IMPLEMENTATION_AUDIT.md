# Implementation Audit

Status: auditoria tecnica antes de novas alteracoes
Data: 2026-08-22
Escopo: somente `wuzbot-engine/`

## Resumo executivo

O Wuzbot Engine existe como projeto separado e nao foram alterados arquivos do GastosApp nesta auditoria.

A base NestJS compila, mas a integracao Wuzapi atual nao pode ser considerada pronta. O OpenAPI oficial do Wuzapi 3.0.0 usa endpoints e payloads diferentes dos implementados no adapter atual. A implementacao Typebot usa os endpoints comprovados pela POC, mas nao foi validada em um teste de aplicacao NestJS com banco e Wuzapi reais.

A auditoria nao implementou novas funcionalidades nem executou migrations.

Legenda:

- ✅ Implementado: existe no codigo.
- ✅ Testado: validado por build, typecheck ou POC real indicada.
- ⚠️ Implementado sem validacao real: existe, mas depende de contrato/infra ainda nao testado.
- ❌ Pendente: nao existe ou nao pode ser considerado concluido.

## 1. Arquivos criados

### Configuracao e operacao

- `package.json` — ✅ Implementado.
- `package-lock.json` — ✅ Implementado.
- `nest-cli.json` — ✅ Implementado.
- `tsconfig.json` — ✅ Implementado.
- `tsconfig.build.json` — ✅ Implementado.
- `.env.example` — ✅ Implementado, ⚠️ revisar `DATABASE_URL` para apontar explicitamente ao banco `wuzbot_engine`.
- `.gitignore` — ✅ Implementado.
- `.dockerignore` — ✅ Implementado.
- `Dockerfile` — ✅ Implementado, ⚠️ não executado em build Docker.
- `docker-compose.yml` — ✅ Implementado, ⚠️ não executado em ambiente Portainer.
- `README.md` — ✅ Implementado.

### Entrada da aplicacao

- `src/main.ts` — ✅ Implementado.
- `src/app.module.ts` — ✅ Implementado.

### Engine

- `src/modules/engine/engine.module.ts` — ✅ Implementado.
- `src/modules/engine/conversation-engine.service.ts` — ✅ Implementado, ⚠️ sem teste de integracao real.
- `src/modules/engine/webhook-processor.service.ts` — ✅ Implementado, ⚠️ depende do contrato real Wuzapi.

### Typebot

- `src/modules/typebot/typebot.module.ts` — ✅ Implementado.
- `src/modules/typebot/conversation-provider.interface.ts` — ✅ Implementado.
- `src/modules/typebot/typebot.provider.ts` — ✅ Implementado com endpoints comprovados pela POC, ⚠️ sem teste integrado no NestJS.

### Wuzapi

- `src/modules/wuzapi/wuzapi.module.ts` — ✅ Implementado.
- `src/modules/wuzapi/wuzapi.adapter.ts` — ⚠️ Implementado sem validação real e incompatível com partes do OpenAPI oficial.
- `src/modules/wuzapi/wuzapi.webhook.controller.ts` — ✅ Implementado, ⚠️ payload real de webhook ainda não capturado.

### Sessões e persistência

- `src/modules/sessions/sessions.module.ts` — ✅ Implementado.
- `src/modules/sessions/session.entity.ts` — ✅ Implementado para tabela própria `wuzbot_session_links`.
- `src/modules/sessions/technical.entities.ts` — ✅ Implementado.
- `src/modules/sessions/session-store.interface.ts` — ✅ Implementado.
- `src/modules/sessions/postgres-session.store.ts` — ✅ Implementado, ⚠️ banco não conectado durante esta auditoria.
- `src/modules/sessions/session-manager.service.ts` — ✅ Implementado, ⚠️ sem teste de restart real.

### Tradução

- `src/modules/translation/translation.module.ts` — ✅ Implementado.
- `src/modules/translation/canonical.types.ts` — ✅ Implementado.
- `src/modules/translation/message-translator.service.ts` — ✅ Implementado, ⚠️ tradução Wuzapi final depende do contrato de botões.

### Common

- `src/modules/common/common.module.ts` — ✅ Implementado.
- `src/modules/common/health/health.controller.ts` — ✅ Implementado.
- `src/modules/common/idempotency-store.interface.ts` — ✅ Implementado.
- `src/modules/common/idempotency.service.ts` — ✅ Implementado, ⚠️ sem teste contra PostgreSQL.
- `src/modules/common/phone-lock.interface.ts` — ✅ Implementado.
- `src/modules/common/phone-lock.service.ts` — ✅ Implementado, ⚠️ sem teste de concorrência real.
- `src/modules/common/dto.ts` — ✅ Implementado, ⚠️ não cobre payload específico Wuzapi.

### Banco

- `src/database/data-source.ts` — ✅ Implementado.
- `src/database/migrations/1710000000000-AddTechnicalSessionColumns.ts` — ✅ Implementado para tabelas próprias do Engine, ⚠️ não executado.

### POC e documentação

- `TYPEBOT_INTEGRATION_SPEC.md` — ✅ Implementado.
- `TYPEBOT_RUNTIME_CONTRACT_REAL.md` — ✅ Implementado com capturas Typebot reais.
- `TYPEBOT_CHOICES_REAL.md` — ✅ Implementado com escolhas textuais reais.
- `tests/typebot-poc/run.mjs` — ✅ Implementado e usado na POC Typebot.
- `tests/typebot-poc/choice-contract.mjs` — ✅ Implementado e usado nas escolhas Typebot.
- `tests/typebot-poc/continue-choice.mjs` — ✅ Implementado.
- `tests/typebot-poc/README.md` — ✅ Implementado.
- `tests/typebot-poc/captures.jsonl` — ✅ Capturas reais Typebot, ⚠️ arquivo local ignorado pelo Git.
- `tests/typebot-poc/session.json` — ✅ Estado local da POC, ⚠️ arquivo local ignorado pelo Git.

## 2. Módulos criados

- `EngineModule` — ✅ Implementado.
- `WuzapiModule` — ✅ Implementado.
- `TypebotModule` — ✅ Implementado.
- `SessionsModule` — ✅ Implementado.
- `TranslationModule` — ✅ Implementado.
- `CommonModule` — ✅ Implementado.

Não existem módulos de finanças, ERP, OCR, IA, PDF, MinIO ou n8n no Engine.

## 3. Providers criados

- `ConversationProvider` — ✅ Implementado como interface/token.
- `TypebotProvider` — ✅ Implementado com `startChat` e `continueChat` comprovados.
- Outros providers, como Botpress, Flowise ou OpenAI — ❌ Pendente.

## 4. Services criados

- `ConversationEngine` — ✅ Implementado, ⚠️ não testado em integração real.
- `WebhookProcessor` — ✅ Implementado, ⚠️ depende do payload Wuzapi real.
- `SessionManager` — ✅ Implementado, ⚠️ sem teste de persistência real.
- `PostgresSessionStore` — ✅ Implementado, ⚠️ sem conexão real nesta auditoria.
- `PostgresIdempotencyStore` — ✅ Implementado, ⚠️ sem teste real.
- `PostgresPhoneLock` — ✅ Implementado, ⚠️ sem teste real.
- `MessageTranslator` — ✅ Implementado, ⚠️ sem contrato Wuzapi de botões validado.
- `HealthController` — ✅ Implementado.

## 5. Adapters criados

- `WuzapiAdapter` — ⚠️ Implementado sem validação real.
- Adapter HTTP interno do `TypebotProvider` — ✅ Implementado, validado anteriormente por POC HTTP independente.
- Adapter de outro canal — ❌ Pendente.

## 6. Entities criadas

- `TechnicalSessionEntity` — ✅ Implementado.
- `IdempotencyEntity` — ✅ Implementado.
- `TechnicalAuditEntity` — ✅ Implementado.

A entidade de sessão usa exclusivamente a tabela técnica `wuzbot_session_links`. Não usa `usuario_atendimento` nem tabelas do GastosApp.

## 7. Migrations criadas

- `1710000000000-AddTechnicalSessionColumns.ts` — ✅ Criada.

A migration cria somente:

- `wuzbot_session_links`;
- `wuzbot_idempotency`;
- `wuzbot_audit`;
- índice de `typebot_session_id`;
- unicidade de telefone na tabela de vínculos.

Status de execução: ❌ não executada.

## 8. Tabelas criadas

Existem no código da migration, mas não foram confirmadas no banco:

- `wuzbot_session_links` — ⚠️ aguardando migration.
- `wuzbot_idempotency` — ⚠️ aguardando migration.
- `wuzbot_audit` — ⚠️ aguardando migration.

Nenhuma tabela do GastosApp é usada pela migration atual.

## 9. DTOs criados

- `CanonicalInputDto` — ✅ Implementado.
- `CanonicalOutputDto` — ✅ Implementado.

Limitação: eles são modelos mínimos e não representam o payload completo do Wuzapi. O contrato oficial usa campos como `Phone`, `Body`, `List`, `RowId`, `Image`, `Document`, `Audio` e `Video`; os DTOs específicos ainda não existem.

## 10. Endpoints criados pelo Engine

### Healthcheck

```http
GET /health
```

Status: ✅ Implementado, ⚠️ não testado com banco real.

### Webhook de entrada Wuzapi

```http
POST /webhooks/wuzapi
```

Status: ✅ Implementado, ⚠️ não testado com evento Wuzapi real.

### Endpoints externos consumidos pelo Engine

Typebot:

```http
POST {TYPEBOT_BASE_URL}/api/v1/typebots/{TYPEBOT_PUBLIC_ID}/startChat
POST {TYPEBOT_BASE_URL}/api/v1/sessions/{sessionId}/continueChat
```

Status: ✅ Confirmados por POC real no Typebot 6.1.

Wuzapi documentados, mas ainda não corretamente conectados ao adapter:

```http
POST /chat/send/text
POST /chat/send/buttons
POST /chat/send/list
POST /chat/send/image
POST /chat/send/document
POST /chat/send/audio
POST /chat/send/video
POST /webhook
```

Status: ❌ Pendente de ajuste e POC Wuzapi.

## 11. Persistência e banco

O `.env.example` contém:

```text
DATABASE_NAME=wuzbot_engine
DATABASE_USER=wuzbot_user
DATABASE_PORT=5432
```

Porém o `DATABASE_URL` ainda está exemplificado como:

```text
postgres://user:password@postgres:5432/typebot
```

Classificação: ⚠️ configuração inconsistente. Antes da execução, a URL precisa apontar ao banco exclusivo `wuzbot_engine` ou `wuzbot`, conforme o provisionamento real.

O código não usa as variáveis separadas `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USER` e `DATABASE_PASSWORD` para montar a URL. O TypeORM utiliza `DATABASE_URL` diretamente.

## 12. Testes executados

- POC Typebot `startChat` com `meu-typebot-f362zn4` — ✅ Testado, HTTP 200.
- POC Typebot `continueChat` com `Opção 1` — ✅ Testado, HTTP 200.
- POC Typebot `continueChat` com `Opção 2` — ✅ Testado, HTTP 200.
- Build NestJS — ✅ Testado.
- `tsc --noEmit` do Engine — ✅ Testado.
- Envio real Wuzapi — ❌ Pendente.
- Webhook real Wuzapi — ❌ Pendente.
- PostgreSQL do Engine — ❌ Pendente.
- Migration aplicada — ❌ Pendente.
- Lock concorrente — ❌ Pendente.
- Idempotência real — ❌ Pendente.
- Docker Compose — ⚠️ não validado em execução.
- Portainer — ❌ Pendente.

## 13. Riscos identificados

1. O adapter Wuzapi atual usa `/api/send` genérico e o corpo `{ to, message }`, enquanto o contrato oficial usa endpoints específicos e campos em PascalCase.
2. O schema oficial não documenta corretamente os itens do endpoint de botões, impedindo uma implementação segura sem teste adicional.
3. O payload de webhook em tempo real não está formalizado no OpenAPI; apenas `HistoryMessage` foi documentado.
4. A migration deve ser executada somente no banco exclusivo do Engine.
5. `DATABASE_URL` pode apontar para a instância errada se o `.env` não for corrigido operacionalmente.
6. O `PhoneLock` usa hash inteiro para advisory lock; colisões de hash podem serializar telefones diferentes, embora não quebrem a correção funcional.
7. Falhas de envio após o Typebot responder podem resultar em reprocessamento se o evento for reenviado; a idempotência atual só marca depois do envio.
8. O `TypebotProvider` converte seleção para texto visível, fato comprovado no Typebot, mas não há fallback validado para ID/value.

## 14. Próximo passo autorizado

Não implementar novas funcionalidades nesta auditoria.

O próximo trabalho técnico deverá ser uma POC Wuzapi isolada para confirmar:

- header `token`;
- `/chat/send/text`;
- `/chat/send/list`;
- estrutura de botões;
- formatos de imagem, documento, áudio e vídeo;
- configuração e captura de webhook;
- HMAC;
- payload recebido em tempo real.
