import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const directory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outputFile = resolve(directory, 'captures.jsonl');
const sessionFile = resolve(directory, 'session.json');
const baseUrl = (process.env.TYPEBOT_BASE_URL ?? '').replace(/\/$/, '');
const publicId = process.env.TYPEBOT_PUBLIC_ID;
const token = process.env.TYPEBOT_TOKEN;
const phone = process.env.TYPEBOT_POC_PHONE ?? 'poc-local-user';
const mediaPath = process.env.TYPEBOT_POC_MEDIA_URL;
const startOnly = process.env.TYPEBOT_POC_START_ONLY === 'true';

if (!baseUrl || !publicId) {
  console.error('Configure TYPEBOT_BASE_URL e TYPEBOT_PUBLIC_ID antes de executar a POC.');
  process.exitCode = 2;
  process.exit();
}

await mkdir(directory, { recursive: true });
await writeFile(outputFile, '', 'utf8');

async function call(name, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  const responseHeaders = Object.fromEntries(response.headers.entries());
  const capture = { name, request: { method: 'POST', path, body }, response: { status: response.status, ok: response.ok, headers: responseHeaders, body: payload }, capturedAt: new Date().toISOString() };
  await appendFile(outputFile, `${JSON.stringify(capture)}\n`, 'utf8');
  return { response, payload };
}

function messageText(text) {
  return { message: { type: 'text', text } };
}

const started = await call('startChat', `/api/v1/typebots/${encodeURIComponent(publicId)}/startChat`, {
  prefilledVariables: { POCPhone: phone, POCChannel: 'external-http' },
  textBubbleContentFormat: 'richText',
});

if (!started.response.ok || !started.payload?.sessionId) {
  console.error(`startChat falhou: HTTP ${started.response.status}`);
  process.exitCode = 1;
  process.exit();
}

const sessionId = started.payload.sessionId;
await writeFile(sessionFile, JSON.stringify({ baseUrl, publicId, sessionId, phone, savedAt: new Date().toISOString() }, null, 2), 'utf8');

if (startOnly) {
  console.log(`startChat concluido com sessionId: ${sessionId}`);
  console.log(`Capturas gravadas em ${outputFile}`);
  process.exit(0);
}

await call('continueChat-text-name', `/api/v1/sessions/${encodeURIComponent(sessionId)}/continueChat`, messageText(process.env.TYPEBOT_POC_NAME ?? 'POC User'));
await call('continueChat-button', `/api/v1/sessions/${encodeURIComponent(sessionId)}/continueChat`, messageText(process.env.TYPEBOT_POC_BUTTON_VALUE ?? 'sim'));
await call('continueChat-list', `/api/v1/sessions/${encodeURIComponent(sessionId)}/continueChat`, messageText(process.env.TYPEBOT_POC_BANK_VALUE ?? 'Banco A'));

if (mediaPath) {
  await call('continueChat-media-url', `/api/v1/sessions/${encodeURIComponent(sessionId)}/continueChat`, {
    message: { type: 'text', text: 'arquivo da POC', attachedFileUrls: [mediaPath] },
  });
}

const saved = JSON.parse(await readFile(sessionFile, 'utf8'));
const recovered = await call('continueChat-recovered-session', `/api/v1/sessions/${encodeURIComponent(saved.sessionId)}/continueChat`, messageText('mensagem apos recuperar sessionId'));

if (recovered.response.status === 404) {
  console.log('A sessao persistida expirou ou nao foi encontrada (HTTP 404).');
} else {
  console.log(`Sessao persistida reutilizada: HTTP ${recovered.response.status}`);
}

console.log(`Capturas gravadas em ${outputFile}`);
console.log('Expiracao automatica nao e forcada: execute novamente com um sessionId antigo apos o timeout configurado.');
