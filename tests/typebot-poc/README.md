# Typebot runtime POC

POC isolada para capturar o contrato real do Typebot. Nao implementa Engine, WuzapiAdapter ou TypebotProvider.

## Configuracao

Defina no ambiente:

```text
TYPEBOT_BASE_URL=https://seu-viewer.example.com
TYPEBOT_PUBLIC_ID=public-id-do-bot
TYPEBOT_TOKEN=token-opcional
TYPEBOT_POC_PHONE=poc-local-user
TYPEBOT_POC_MEDIA_URL=https://arquivo-publico.example.com/test.pdf
```

O bot publicado deve conter, nesta ordem, nome, escolha Sim/Nao e escolha Banco A/B/C/D. A POC envia os valores configurados por `TYPEBOT_POC_BUTTON_VALUE` e `TYPEBOT_POC_BANK_VALUE`.

## Execucao

```powershell
$env:TYPEBOT_BASE_URL='https://seu-viewer.example.com'
$env:TYPEBOT_PUBLIC_ID='public-id-do-bot'
npm run poc:typebot
```

Os payloads ficam em `captures.jsonl` e a sessao em `session.json`. Esses arquivos sao locais e ignorados pelo Git.

A expiracao nao e forcada pelo script. Para valida-la, execute novamente usando o `sessionId` salvo depois do timeout configurado na instancia e observe HTTP 404 ou a resposta real do runtime.
