import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WebhookProcessor } from '../../dist/modules/engine/webhook-processor.service.js';
import { CanonicalInputType, CanonicalOutputType } from '../../dist/modules/translation/canonical.types.js';

describe('WebhookProcessor', () => {
  it('should process webhook payload, invoke engine, send outputs, and mark idempotency', async () => {
    let sentMessages = [];
    let markedIdempotency = null;

    const mockWuzapi = {
      validateWebhookSecret: () => {},
      normalizeWebhook: (payload) => ({
        phone: '5511999998888',
        externalMessageId: payload.message_id,
        type: CanonicalInputType.TEXT,
        text: payload.text_content,
        receivedAt: new Date(),
      }),
      send: async (phone, output) => {
        sentMessages.push({ phone, output });
      },
    };

    const mockEngine = {
      handle: async () => [
        { type: CanonicalOutputType.TEXT, text: 'Resposta 1' },
        { type: CanonicalOutputType.TEXT, text: 'Resposta 2' },
      ],
    };

    const processedSet = new Set();
    const mockIdempotency = {
      hasProcessed: async (id) => processedSet.has(id),
      markProcessed: async (id, phone, corrId) => {
        processedSet.add(id);
        markedIdempotency = { id, phone, corrId };
      },
    };

    const mockPhoneLock = {
      runExclusive: async (phone, op) => op(),
    };

    const processor = new WebhookProcessor(
      mockWuzapi,
      mockEngine,
      mockIdempotency,
      mockPhoneLock,
    );

    await processor.process({
      chat_jid: '5511999998888@s.whatsapp.net',
      message_id: 'msg_webhook_1',
      text_content: 'Olá',
    });

    assert.equal(sentMessages.length, 2);
    assert.equal(sentMessages[0].phone, '5511999998888');
    assert.equal(sentMessages[0].output.text, 'Resposta 1');
    assert.equal(sentMessages[1].output.text, 'Resposta 2');
    assert.equal(markedIdempotency.id, 'msg_webhook_1');
    assert.equal(markedIdempotency.phone, '5511999998888');
  });

  it('should skip duplicate messages when idempotency check succeeds', async () => {
    let engineCalled = false;

    const mockWuzapi = {
      validateWebhookSecret: () => {},
      normalizeWebhook: (payload) => ({
        phone: '5511999998888',
        externalMessageId: payload.message_id,
        type: CanonicalInputType.TEXT,
        text: 'Duplicate',
        receivedAt: new Date(),
      }),
      send: async () => {},
    };

    const mockEngine = {
      handle: async () => {
        engineCalled = true;
        return [];
      },
    };

    const mockIdempotency = {
      hasProcessed: async (id) => id === 'msg_duplicate_1',
      markProcessed: async () => {},
    };

    const mockPhoneLock = {
      runExclusive: async (phone, op) => op(),
    };

    const processor = new WebhookProcessor(
      mockWuzapi,
      mockEngine,
      mockIdempotency,
      mockPhoneLock,
    );

    await processor.process({
      chat_jid: '5511999998888@s.whatsapp.net',
      message_id: 'msg_duplicate_1',
      text_content: 'Duplicate',
    });

    assert.equal(engineCalled, false);
  });
});
