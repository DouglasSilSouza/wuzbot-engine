import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TypebotProvider } from '../../dist/modules/typebot/typebot.provider.js';
import { CanonicalInputType, CanonicalOutputType } from '../../dist/modules/translation/canonical.types.js';

describe('TypebotProvider', () => {
  let provider;
  let originalFetch;
  let fetchCalls = [];

  before(() => {
    process.env.TYPEBOT_BASE_URL = 'https://viewer.example.com';
    process.env.TYPEBOT_PUBLIC_ID = 'meu-typebot-test-123';
    process.env.TYPEBOT_TOKEN = 'test-typebot-token';
    provider = new TypebotProvider();
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
    fetchCalls = [];
  });

  describe('createSession', () => {
    before(() => {
      originalFetch = global.fetch;
    });

    it('should call startChat with prefilledVariables and return sessionId and initialOutputs', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sessionId: 'sess_abc123',
            messages: [
              {
                id: 'msg_1',
                type: 'text',
                content: {
                  type: 'richText',
                  richText: [
                    { type: 'p', children: [{ text: 'Olá! Bem-vindo ao atendimento.' }] },
                    { type: 'p', children: [{ text: 'Como posso ajudar você hoje?' }] },
                  ],
                },
              },
            ],
            input: {
              id: 'input_choice',
              type: 'choice input',
              items: [
                { id: 'opt_1', content: 'Opção 1', value: 'opt_1' },
                { id: 'opt_2', content: 'Opção 2', value: 'opt_2' },
              ],
            },
          }),
        };
      };

      const result = await provider.createSession('5511999998888');
      assert.equal(result.sessionId, 'sess_abc123');
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://viewer.example.com/api/v1/typebots/meu-typebot-test-123/startChat');
      assert.equal(fetchCalls[0].options.headers.Authorization, 'Bearer test-typebot-token');

      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.prefilledVariables.Phone, '5511999998888');
      assert.equal(body.prefilledVariables.Channel, 'whatsapp');

      assert.equal(result.initialOutputs.length, 1);
      assert.equal(result.initialOutputs[0].type, CanonicalOutputType.BUTTONS);
      assert.equal(
        result.initialOutputs[0].text,
        'Olá! Bem-vindo ao atendimento.\nComo posso ajudar você hoje?',
      );
      assert.equal(result.initialOutputs[0].options.length, 2);
      assert.equal(result.initialOutputs[0].options[0].label, 'Opção 1');
      assert.equal(result.initialOutputs[0].options[1].label, 'Opção 2');
    });
  });

  describe('sendInput', () => {
    before(() => {
      originalFetch = global.fetch;
    });

    it('should send text input and return subsequent messages and options', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            messages: [
              {
                id: 'msg_2',
                type: 'text',
                content: {
                  type: 'richText',
                  richText: [
                    { type: 'p', children: [{ text: 'Você selecionou a opção 1' }] },
                  ],
                },
              },
            ],
          }),
        };
      };

      const outputs = await provider.sendInput('sess_abc123', {
        phone: '5511999998888',
        externalMessageId: 'ext_1',
        type: CanonicalInputType.TEXT,
        text: 'Opção 1',
        receivedAt: new Date(),
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://viewer.example.com/api/v1/sessions/sess_abc123/continueChat');
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.deepEqual(body.message, { type: 'text', text: 'Opção 1' });

      assert.equal(outputs.length, 1);
      assert.equal(outputs[0].type, CanonicalOutputType.TEXT);
      assert.equal(outputs[0].text, 'Você selecionou a opção 1');
    });

    it('should send choice selection label as message text', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ messages: [] }),
        };
      };

      await provider.sendInput('sess_abc123', {
        phone: '5511999998888',
        externalMessageId: 'ext_2',
        type: CanonicalInputType.LIST_REPLY,
        text: 'Relatórios',
        selection: { id: 'opt_rel', label: 'Relatórios', value: 'opt_rel' },
        receivedAt: new Date(),
      });

      assert.equal(fetchCalls.length, 1);
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.deepEqual(body.message, { type: 'text', text: 'Relatórios' });
    });

    it('should suppress "Invalid message" text when response contains choice input and redisplay menu', async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          messages: [
            {
              id: 'msg_err',
              type: 'text',
              content: {
                type: 'richText',
                richText: [
                  { type: 'p', children: [{ text: 'Invalid message. Please, try again.' }] },
                ],
              },
            },
          ],
          input: {
            id: 'input_choice',
            type: 'choice input',
            items: [
              { id: 'k88taosrabnu2vduaao4u25x', content: 'Opção 1' },
              { id: 'kkztwt9ce44y1onm2x8ee9en', content: 'Opção 2' },
            ],
          },
        }),
      });

      const outputs = await provider.sendInput('sess_abc123', {
        phone: '5511999998888',
        externalMessageId: 'ext_invalid',
        type: CanonicalInputType.TEXT,
        text: 'qualquer texto',
        receivedAt: new Date(),
      });

      assert.equal(outputs.length, 1);
      assert.equal(outputs[0].type, CanonicalOutputType.BUTTONS);
      assert.equal(outputs[0].options.length, 2);
      assert.equal(outputs[0].options[0].label, 'Opção 1');
      assert.equal(outputs[0].options[1].label, 'Opção 2');
      // Verify no TEXT message with "Invalid message" was produced
      assert.equal(outputs.some((o) => o.type === CanonicalOutputType.TEXT), false);
    });

    it('should throw NotFoundException when Typebot responds with 404', async () => {
      global.fetch = async () => ({
        ok: false,
        status: 404,
        json: async () => ({ code: 'NOT_FOUND', message: 'Session not found.' }),
      });

      await assert.rejects(
        () =>
          provider.sendInput('expired_session', {
            phone: '5511999998888',
            externalMessageId: 'ext_3',
            type: CanonicalInputType.TEXT,
            text: 'Olá',
            receivedAt: new Date(),
          }),
        { name: 'NotFoundException' },
      );
    });
  });
});
