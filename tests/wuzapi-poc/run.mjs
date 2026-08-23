import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const directory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const captureFile = resolve(directory, 'captures.jsonl');
const baseUrl = (process.env.WUZAPI_URL ?? '').replace(/\/$/, '');
const token = process.env.WUZAPI_USER_TOKEN ?? '';
const phone = process.env.WUZAPI_TEST_PHONE ?? '';

if (!baseUrl || !token || !phone) {
  console.error('Configure WUZAPI_URL, WUZAPI_USER_TOKEN e WUZAPI_TEST_PHONE.');
  process.exit(2);
}

await mkdir(directory, { recursive: true });
await writeFile(captureFile, '', 'utf8');

async function request(name, method, path, body) {
  const headers = { 'Content-Type': 'application/json', token };
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let responseBody;
  try { responseBody = text ? JSON.parse(text) : null; } catch { responseBody = { raw: text }; }
  const capture = {
    name,
    request: { method, url: `${baseUrl}${path}`, headers: { 'Content-Type': 'application/json', tokenSent: true }, body: body ?? null },
    response: { status: response.status, statusText: response.statusText, ok: response.ok, headers: Object.fromEntries(response.headers.entries()), body: responseBody },
    capturedAt: new Date().toISOString(),
  };
  await appendFile(captureFile, `${JSON.stringify(capture)}\n`, 'utf8');
  console.log(`${name}: HTTP ${response.status}`);
  return { status: response.status, body: responseBody };
}

await request('send-text', 'POST', '/chat/send/text', {
  Phone: phone,
  Body: 'Wuzbot Engine POC - texto',
  Id: `wuzbot-poc-text-${Date.now()}`,
});

await request('send-list', 'POST', '/chat/send/list', {
  Phone: phone,
  ButtonText: 'Selecionar',
  Desc: 'Wuzbot Engine POC',
  TopText: 'Lista de teste',
  FooterText: 'Teste Wuzapi',
  List: [
    { title: 'Opcao A', desc: 'Primeira opcao', RowId: 'poc-a' },
    { title: 'Opcao B', desc: 'Segunda opcao', RowId: 'poc-b' },
  ],
});

await request('send-image', 'POST', '/chat/send/image', {
  Phone: phone,
  Image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  Caption: 'Wuzbot Engine POC - imagem',
  Id: `wuzbot-poc-image-${Date.now()}`,
});

console.log(`Capturas gravadas em ${captureFile}`);
