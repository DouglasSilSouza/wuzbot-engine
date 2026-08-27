# Wuzbot Engine 🤖

Orquestrador e Middleware NestJS entre **WhatsApp (via Wuzapi)**, **Typebot (Máquina de Estados)** e **WuzMind (Serviço Cognitivo de IA)**.

---

## 🏗️ Arquitetura e Papéis

```text
WhatsApp ──► Wuzapi ──► Wuzbot Engine ──► Typebot (Máquina de Estados)
                              │
                              ├──► WuzMind (Classificação de Intenção & Recuperação)
                              │
                              └──► n8n (Execução de OCR / PDFs / Banco)
```

1. **Typebot**: Máquina de estados determinística, menus interativos, validação de etapas e variáveis de sessão.
2. **Wuzbot Engine**: Orquestração técnica, sessões de usuário, comandos globais locais (`MENU`, `SAIR`, `AJUDA`), normalização de JIDs e chamadas seguras à API REST do WuzMind.
3. **WuzMind**: Classificação de intenções (`POST /v1/intent/classify`), recuperação fora de escopo (`POST /v1/recovery`), detecção de comportamento humano e categorização preliminar de mídias.
4. **n8n**: OCR de comprovantes, transcrição de áudio, geração de relatórios e mutações no banco financeiro.

---

## ⚙️ Variáveis de Ambiente (`.env`)

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta HTTP do engine | `3000` |
| `WUZAPI_URL` | Endpoint base do gateway Wuzapi | - |
| `TYPEBOT_BASE_URL` | URL do servidor Typebot Viewer | - |
| `TYPEBOT_PUBLIC_ID` | Identificador público do bot Typebot | - |
| `WUZMIND_ENABLED` | Habilita/desabilita chamadas cognitivas ao WuzMind | `true` |
| `WUZMIND_URL` | URL do serviço WuzMind (rede interna Docker) | `http://wuzmind-service:3000` |
| `WUZMIND_API_KEY` | Chave de autenticação enviada no header `x-wuzmind-api-key` | - |
| `WUZMIND_TIMEOUT_MS` | Timeout de chamada ao WuzMind | `10000` |
| `WUZMIND_MIN_CONFIDENCE` | Confiança mínima para roteamento automático | `0.65` |

---

## 🔐 Controle de Acesso

O controle de acesso **NÃO é feito no wuzbot-engine**. Ele é de responsabilidade do **backend (n8n)** e da **máquina de estados (Typebot)**:

- O **Typebot** é o centro de tudo (máquina de estados).
- O **n8n** é o backend, que valida se o usuário é autorizado.
- O **wuzbot-engine** apenas conecta o usuário (WhatsApp) ao Typebot, sem bloquear nem decidir acesso.

O fluxo de validação (no n8n, workflow "configurações Wuzbot", webhook `user_auth`):
1. O Typebot chama o webhook `user_auth` com o telefone.
2. O n8n consulta a tabela `usuarios` e responde `{ "authorized": true/false, "user": {...} }`.
3. O Typebot decide: se `authorized=true` segue o fluxo; senão, bloqueia com "acesso restrito".

## 🤖 Uso da IA (WuzMind)

A IA (WuzMind) **não** participa do roteamento geral do bot nem do controle de acesso.
Ela é acionada **apenas após o Typebot enviar uma informação no fluxo**, quando o próprio fluxo do Typebot insere o marcador `__WUZMIND_EVALUATE__` nos dados de saída. Nesse caso, a IA processa/interpreta a informação recebida.

Não há mais:
- Roteamento automático por intenção no início da sessão.
- Recovery/redisplay de menu via IA quando o usuário digita texto livre.
- Auto-avanço de opção por intenção.

O fluxo é sempre controlado pelo Typebot (máquina de estados determinística). Quando o usuário não corresponde às opções de um menu, o próprio Typebot reexibe as opções.

---

## 🚀 Execução e Testes

```bash
# Instalação
npm install

# Compilação TypeScript
npm run build

# Execução de Testes Unitários e E2E
npm test
```
