# Wuzapi runtime POC

Runner isolado para validar texto, lista e imagem contra o contrato real do Wuzapi.

O token nunca e gravado nas capturas. O runner usa apenas variaveis de ambiente:

```text
WUZAPI_URL
WUZAPI_USER_TOKEN
WUZAPI_TEST_PHONE
```

Execucao:

```powershell
npm run poc:wuzapi
```

Capturas:

```text
captures.jsonl
```

A POC nao configura webhook nem testa botoes. O webhook precisa de uma URL publica e o endpoint de botoes tem schema incompleto na especificacao oficial.
