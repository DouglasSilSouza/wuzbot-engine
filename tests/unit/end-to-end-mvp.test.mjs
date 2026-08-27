import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { WuzapiAdapter } from '../../dist/modules/wuzapi/wuzapi.adapter.js';
import { TypebotProvider } from '../../dist/modules/typebot/typebot.provider.js';
import { MessageTranslator } from '../../dist/modules/translation/message-translator.service.js';
import { SessionManager } from '../../dist/modules/sessions/session-manager.service.js';
import { ConversationEngine } from '../../dist/modules/engine/conversation-engine.service.js';
import { WebhookProcessor } from '../../dist/modules/engine/webhook-processor.service.js';

describe('End-to-End MVP Conversation Flow (Text, List, Image)', () => {
  let originalFetch;
  let typebotRequests = [];
  let wuzapiRequests = [];

  let adapter;
  let provider;
  let translator;
  let sessionStore;
  let sessionManager;
  let conversationEngine;
  let webhookProcessor;

  before(() => {
    process.env.WUZAPI_URL = 'https://wuzapi.dsilvamoda.cloud';
    process.env.WUZAPI_USER_TOKEN = 'real-token-test';
    process.env.TYPEBOT_BASE_URL = 'https://viewer.dsilvamoda.cloud';
    process.env.TYPEBOT_PUBLIC_ID = 'meu-typebot-f362zn4';
    process.env.TYPEBOT_TOKEN = 'real-typebot-token';

    // In-memory technical session store for test
    const sessions = new Map();
    sessionStore = {
      findByPhone: async (phone) => sessions.get(phone) || null,
      save: async (session) => {
        const record = { id: 1, ...session };
        sessions.set(session.phone, record);
        return record;
      },
      touch: async (phone) => {
        const current = sessions.get(phone);
        if (current) current.lastInteractionAt = new Date();
      },
    };

    // In-memory idempotency store
    const processedIds = new Set();
    const idempotencyStore = {
      hasProcessed: async (id) => processedIds.has(id),
      markProcessed: async (id) => processedIds.add(id),
    };

    // In-memory phone lock
    const phoneLock = {
      runExclusive: async (phone, fn) => fn(),
    };

    adapter = new WuzapiAdapter();
    provider = new TypebotProvider();
    translator = new MessageTranslator();
    sessionManager = new SessionManager(sessionStore, provider);

    const globalCommands = { detect: () => ({ isGlobalCommand: false }) };
    const humanBehavior = { detect: async () => ({ isHumanBehavior: false }) };
    const intentRouter = { evaluate: async () => ({ shouldRoute: false }) };
    const recoveryMode = { handleRecovery: async (phone, msg, opts) => [{ type: 'BUTTONS', text: 'Recuperado', options: opts }] };
    const mediaRouter = { classifyAndRoute: async () => ({}) };
    const contextManager = { setLastIntent: async () => ({}) };
    const contextSync = { clearBoth: async () => {}, syncToRemote: async () => {} };
    const userAccess = { isAuthorized: async () => true };

    conversationEngine = new ConversationEngine(
      sessionManager,
      translator,
      provider,
      globalCommands,
      humanBehavior,
      intentRouter,
      recoveryMode,
      mediaRouter,
      contextManager,
      contextSync,
      userAccess,
    );
    webhookProcessor = new WebhookProcessor(adapter, conversationEngine, idempotencyStore, phoneLock);
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
    typebotRequests = [];
    wuzapiRequests = [];
  });

  it('should execute full roundtrip: WhatsApp -> Wuzapi -> Engine -> Typebot -> Wuzapi -> WhatsApp', async () => {
    originalFetch = global.fetch;

    // Mock network fetch for both Typebot and Wuzapi
    global.fetch = async (url, options) => {
      const urlString = String(url);

      // Typebot startChat
      if (urlString.includes('/api/v1/typebots/meu-typebot-f362zn4/startChat')) {
        typebotRequests.push({ endpoint: 'startChat', body: JSON.parse(options.body) });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sessionId: 'sess_e2e_001',
            messages: [
              {
                id: 'msg_welcome',
                type: 'text',
                content: {
                  type: 'richText',
                  richText: [
                    { type: 'p', children: [{ text: 'Olá! Seja bem vindo.' }] },
                    { type: 'p', children: [{ text: 'Escolha uma opção:' }] },
                  ],
                },
              },
            ],
            input: {
              id: 'choice_1',
              type: 'choice input',
              items: [
                { id: 'opt_1', content: 'Opção 1', value: 'opt_1' },
                { id: 'opt_2', content: 'Opção 2', value: 'opt_2' },
              ],
            },
          }),
        };
      }

      // Typebot continueChat
      if (urlString.includes('/api/v1/sessions/sess_e2e_001/continueChat')) {
        const body = JSON.parse(options.body);
        typebotRequests.push({ endpoint: 'continueChat', body });

        if (body.message?.text === 'Opção 1') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              messages: [
                {
                  id: 'msg_resp_1',
                  type: 'text',
                  content: {
                    type: 'richText',
                    richText: [{ type: 'p', children: [{ text: 'Você selecionou a opção 1' }] }],
                  },
                },
                {
                  id: 'msg_img_1',
                  type: 'image',
                  content: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                  },
                },
              ],
            }),
          };
        }
      }

      // Wuzapi /chat/send/text
      if (urlString.includes('/chat/send/text')) {
        wuzapiRequests.push({ endpoint: '/chat/send/text', headers: options.headers, body: JSON.parse(options.body) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz_text_1' } }),
        };
      }

      // Wuzapi /chat/send/buttons
      if (urlString.includes('/chat/send/buttons')) {
        wuzapiRequests.push({ endpoint: '/chat/send/buttons', headers: options.headers, body: JSON.parse(options.body) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz_btn_1' } }),
        };
      }

      // Wuzapi /chat/send/list
      if (urlString.includes('/chat/send/list')) {
        wuzapiRequests.push({ endpoint: '/chat/send/list', headers: options.headers, body: JSON.parse(options.body) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz_list_1' } }),
        };
      }

      // Wuzapi /chat/send/image
      if (urlString.includes('/chat/send/image')) {
        wuzapiRequests.push({ endpoint: '/chat/send/image', headers: options.headers, body: JSON.parse(options.body) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz_image_1' } }),
        };
      }

      throw new Error(`Unexpected request to ${urlString}`);
    };

    // STEP 1: First inbound message from user on WhatsApp ("Oi")
    await webhookProcessor.process({
      chat_jid: '5511999998888@s.whatsapp.net',
      message_id: 'inbound_001',
      text_content: 'Oi',
      timestamp: '2026-08-22T17:00:00Z',
    });

    // Verify Typebot startChat was called
    assert.equal(typebotRequests.length, 1);
    assert.equal(typebotRequests[0].endpoint, 'startChat');
    assert.equal(typebotRequests[0].body.prefilledVariables.Phone, '5511999998888');

    // Verify Wuzapi sent 1 unified buttons message with welcome text attached
    assert.equal(wuzapiRequests.length, 1);
    assert.equal(wuzapiRequests[0].endpoint, '/chat/send/buttons');
    assert.equal(wuzapiRequests[0].body.Body, 'Olá! Seja bem vindo.\nEscolha uma opção:');
    assert.equal(wuzapiRequests[0].headers.token, 'real-token-test');
    assert.equal(wuzapiRequests[0].body.Buttons.length, 2);
    assert.equal(wuzapiRequests[0].body.Buttons[0].title, 'Opção 1');
    assert.equal(wuzapiRequests[0].body.Buttons[1].title, 'Opção 2');



    // Reset counters for STEP 2
    typebotRequests = [];
    wuzapiRequests = [];


    // STEP 2: User responds selecting "Opção 1"
    await webhookProcessor.process({
      chat_jid: '5511999998888@s.whatsapp.net',
      message_id: 'inbound_002',
      list_reply: {
        id: 'opt_1',
        title: 'Opção 1',
      },
      timestamp: '2026-08-22T17:01:00Z',
    });

    // Verify Typebot continueChat was called with text "Opção 1"
    assert.equal(typebotRequests.length, 1);
    assert.equal(typebotRequests[0].endpoint, 'continueChat');
    assert.deepEqual(typebotRequests[0].body.message, { type: 'text', text: 'Opção 1' });

    // Verify Wuzapi sent response text and image
    assert.equal(wuzapiRequests.length, 2);
    assert.equal(wuzapiRequests[0].endpoint, '/chat/send/text');
    assert.equal(wuzapiRequests[0].body.Body, 'Você selecionou a opção 1');

    assert.equal(wuzapiRequests[1].endpoint, '/chat/send/image');
    assert.match(wuzapiRequests[1].body.Image, /^data:image\/png;base64,/);
  });
});
