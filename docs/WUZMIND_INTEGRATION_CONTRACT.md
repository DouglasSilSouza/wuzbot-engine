# WuzMind Integration Contract Specification

**Status:** Confirmed Active Contract  
**Protocol:** REST / JSON  
**Authentication Header:** `x-wuzmind-api-key: <WUZMIND_API_KEY>`  
**Default Base URL:** `http://wuzmind-service:3000` (Docker internal) / `http://localhost:3000` (Local)  
**Timeout:** Configurable (`WUZMIND_TIMEOUT_MS=10000`, default 10s)

---

## 1. Endpoints & Payloads

### 1.1. Health Check
- **Route:** `GET /health`
- **Auth:** Public
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2026-08-23T12:00:00.000Z",
  "providers": {
    "ollama": { "status": "up" },
    "gemini": { "status": "up" },
    "openai": { "status": "up" }
  }
}
```

---

### 1.2. Classify Intent
- **Route:** `POST /v1/intent/classify`
- **Auth:** `x-wuzmind-api-key`
- **Request Body:**
```json
{
  "phone": "5511999998888",
  "message": "quanto gastei no nubank esse mês?",
  "text": "quanto gastei no nubank esse mês?",
  "currentState": "IDLE",
  "waitingFor": null,
  "availableOptions": ["Registrar gasto", "Relatórios"],
  "context": {
    "lastBank": "NUBANK",
    "lastMonth": "2026-08"
  }
}
```
- **Response `200 OK`:**
```json
{
  "intent": "CONSULTAR_RELATORIO",
  "confidence": 0.95,
  "entities": {
    "bank": "NUBANK",
    "period": "MES_ATUAL"
  },
  "suggestedAction": "START_TYPEBOT_FLOW",
  "targetFlow": "RELATORIOS",
  "provider": "OLLAMA"
}
```

---

### 1.3. Recovery Mode (Out-of-Scope Assistant)
- **Route:** `POST /v1/recovery`
- **Auth:** `x-wuzmind-api-key`
- **Request Body:**
```json
{
  "phone": "5511999998888",
  "message": "oi tudo bem?",
  "currentState": "WAITING_CHOICE",
  "waitingFor": "menu_options",
  "availableOptions": ["Opção 1", "Opção 2"],
  "context": {}
}
```
- **Response `200 OK`:**
```json
{
  "action": "REDISPLAY_MENU",
  "message": "Olá! Estou aguardando a seleção de uma das opções abaixo para continuarmos. Se preferir, digite MENU para recomeçar.",
  "matchedOption": null,
  "intent": "CONVERSA_GERAL",
  "confidence": 0.90,
  "provider": "OLLAMA"
}
```

---

### 1.4. Detect Human Behavior
- **Route:** `POST /v1/human-behavior/detect`
- **Auth:** `x-wuzmind-api-key`
- **Request Body:**
```json
{
  "message": "bom dia"
}
```
- **Response `200 OK`:**
```json
{
  "isHumanBehavior": true,
  "category": "GREETING",
  "suggestedMessage": "Bom dia! Como posso ajudar você hoje?"
}
```

---

### 1.5. Classify Media
- **Route:** `POST /v1/media/classify`
- **Auth:** `x-wuzmind-api-key`
- **Request Body:**
```json
{
  "phone": "5511999998888",
  "mediaType": "IMAGE",
  "mimeType": "image/jpeg",
  "fileName": "comprovante.jpg",
  "caption": "Paguei o almoço",
  "url": "https://..."
}
```
- **Response `200 OK`:**
```json
{
  "classification": "COMPROVANTE",
  "confidence": 0.92,
  "suggestedAction": "SEND_TO_N8N_OCR",
  "provider": "OLLAMA"
}
```

---

### 1.6. Cognitive Context Management
- **Routes:**
  - `GET /v1/context/:phone`
  - `PUT /v1/context/:phone`
  - `DELETE /v1/context/:phone`
- **Auth:** `x-wuzmind-api-key`
- **PUT Body:**
```json
{
  "currentState": "IDLE",
  "lastIntent": "REGISTRAR_GASTO",
  "lastBank": "NUBANK",
  "lastMonth": "2026-08",
  "lastFlow": "GASTOS",
  "waitingFor": null,
  "sessionStatus": "ACTIVE",
  "contextData": { "valor": 45.0 }
}
```

---

## 2. Enums

### 2.1. IntentEnum
`REGISTRAR_GASTO`, `REGISTRAR_ENTRADA`, `CONSULTAR_RELATORIO`, `ENVIAR_COMPROVANTE`, `ENVIAR_DOCUMENTO`, `ENVIAR_AUDIO`, `AJUDA`, `MENU`, `SAIR`, `CONTINUAR`, `CONVERSA_GERAL`, `FORA_DE_ESCOPO`, `DESCONHECIDA`.

### 2.2. SuggestedActionEnum
`CONTINUE_TYPEBOT`, `START_TYPEBOT_FLOW`, `REDISPLAY_MENU`, `RESET_SESSION`, `END_SESSION`, `SEND_TO_N8N_OCR`, `SEND_TO_N8N_TRANSCRIPTION`, `ANSWER_AND_KEEP_STATE`, `STATIC_FALLBACK`, `NO_ACTION`.

### 2.3. HumanBehaviorCategoryEnum
`GREETING`, `THANKS`, `LAUGHTER`, `FAREWELL`, `CHAT`, `CONFIRMATION`, `OTHER`.

### 2.4. MediaClassificationEnum
`COMPROVANTE`, `FATURA`, `EXTRATO`, `AUDIO_DESPESA`, `AUDIO_DUVIDA`, `DOCUMENTO_OUTRO`, `IMAGEM_OUTRA`, `DESCONHECIDO`.

---

## 3. Resilience & Fallback Rules

1. **WuzMind Disabled (`WUZMIND_ENABLED=false`):**
   - The engine gracefully skips all WuzMind calls and relies on deterministic local logic.
2. **Network Timeout / 5xx / 429:**
   - Single try with circuit breaker.
   - Falls back to `STATIC_FALLBACK` and preserves Typebot state.
3. **Security:**
   - Headers and sensitive user data are redacted from logs (`x-wuzmind-api-key: ***`).
   - WuzMind suggestions never bypass Typebot confirmations or execute direct SQL.
