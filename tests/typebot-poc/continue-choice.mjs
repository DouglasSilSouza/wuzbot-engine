import { appendFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const directory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const sessionFile = resolve(directory, 'session.json');
const outputFile = resolve(directory, 'captures.jsonl');
const choice = process.argv[2];
const name = process.argv[3] ?? `continueChat-${choice}`;

if (!choice) {
  console.error('Informe a escolha como primeiro argumento.');
  process.exit(2);
}

const session = JSON.parse(await readFile(sessionFile, 'utf8'));
const token = process.env.TYPEBOT_TOKEN;
const headers = { 'Content-Type': 'application/json' };
if (token) headers.Authorization = `Bearer ${token}`;

const path = `/api/v1/sessions/${encodeURIComponent(session.sessionId)}/continueChat`;
const body = { message: { type: 'text', text: choice } };
const response = await fetch(`${session.baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const responseText = await response.text();
let responseBody;
try { responseBody = responseText ? JSON.parse(responseText) : null; } catch { responseBody = { raw: responseText }; }

const capture = {
  name,
  sessionId: session.sessionId,
  request: { method: 'POST', url: `${session.baseUrl}${path}`, headers: { 'Content-Type': 'application/json', authorizationSent: Boolean(token) }, body },
  response: { status: response.status, statusText: response.statusText, ok: response.ok, headers: Object.fromEntries(response.headers.entries()), body: responseBody },
  capturedAt: new Date().toISOString(),
};
await appendFile(outputFile, `${JSON.stringify(capture)}\n`, 'utf8');
console.log(`${name}: HTTP ${response.status}`);
console.log(`Captura acrescentada em ${outputFile}`);
