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
| `GASTOS_DATABASE_URL` | URL do banco principal de gastos (tabela `usuarios`) para controle de acesso | - |
| `USER_ACCESS_ENABLED` | Habilita a verificação de usuário autorizado. Quando `false` ou sem `GASTOS_DATABASE_URL`, não bloqueia ninguém | `true` |

---

## 🔐 Controle de Acesso

O engine, ao receber qualquer mensagem, verifica se o telefone do remetente está cadastrado e **ativo** na tabela `usuarios` do banco principal (`GASTOS_DATABASE_URL`). Apenas usuários autorizados (com `pode_ver_gastos` ou perfil `ADMIN`) navegam pelo menu do Typebot. Caso contrário, recebem uma mensagem de acesso restrito.

**Fail-closed**: o controle de acesso é habilitado por padrão. Se `GASTOS_DATABASE_URL` não estiver configurada, o acesso é **bloqueado** por segurança. Para desativar o controle, defina `USER_ACCESS_ENABLED=false`.

> ⚠️ **Importante**: no ambiente de produção (arquivo `/opt/gastoapp/envs/wuzbot-engine.env`), configure `GASTOS_DATABASE_URL` apontando para o banco `gastosdb` para que os usuários autorizados sejam reconhecidos.

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
