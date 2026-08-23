import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const directory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outputFile = resolve(directory, 'captures.jsonl');
const baseUrl = (process.env.TYPEBOT_BASE_URL ?? '').replace(/\/$/, '');
const publicId = process.env.TYPEBOT_PUBLIC_ID;
const token = process.env.TYPEBOT_TOKEN;
const choices = ['Opção 1', 'Opção 2'];

if (!baseUrl || !publicId) {
  console.error('Configure TYPEBOT_BASE_URL e TYPEBOT_PUBLIC_ID antes de executar.');
  process.exit(2);
}

await mkdir(directory, { recursive: true });
await writeFile(outputFile, '', 'utf8');

async function post(name, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await response.text();
  let responseBody;
  try { responseBody = text ? JSON.parse(text) : null; } catch { responseBody = { raw: text }; }
  const capture = {
    name,
    request: { method: 'POST', url: `${baseUrl}${path}`, headers: { 'Content-Type': 'application/json', authorizationSent: Boolean(token) }, body },
    response: { status: response.status, statusText: response.statusText, ok: response.ok, headers: Object.fromEntries(response.headers.entries()), body: responseBody },
    capturedAt: new Date().toISOString(),
  };
  await appendFile(outputFile, `${JSON.stringify(capture)}\n`, 'utf8');
  return { response, body: responseBody };
}

for (const choice of choices) {
  const started = await post(`startChat-${choice}`, `/api/v1/typebots/${encodeURIComponent(publicId)}/startChat`, {
    prefilledVariables: { POCChoice: choice, POCChannel: 'external-http' },
    textBubbleContentFormat: 'richText',
  });
  if (!started.response.ok || !started.body?.sessionId) {
    console.error(`startChat-${choice} falhou: HTTP ${started.response.status}`);
    continue;
  }
  await post(`continueChat-${choice}`, `/api/v1/sessions/${encodeURIComponent(started.body.sessionId)}/continueChat`, {
    message: { type: 'text', text: choice },
  });
}

console.log(`Capturas gravadas em ${outputFile}`);
