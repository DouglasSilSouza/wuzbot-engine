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

## 🚀 Execução e Testes

```bash
# Instalação
npm install

# Compilação TypeScript
npm run build

# Execução de Testes Unitários e E2E
npm test
```
