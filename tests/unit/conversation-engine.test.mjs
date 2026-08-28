import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { ConversationEngine } from '../../dist/modules/engine/conversation-engine.service.js';
import { MessageTranslator } from '../../dist/modules/translation/message-translator.service.js';
import { CanonicalInputType, CanonicalOutputType } from '../../dist/modules/translation/canonical.types.js';
import { GlobalCommandService } from '../../dist/modules/commands/global-command.service.js';

const createEngine = (mockSessions, translator, mockProvider, overrides = {}) => {
  const globalCommands = overrides.globalCommands ?? new GlobalCommandService();
  const contextManager = overrides.contextManager ?? {
    resetContext: async () => ({}),
  };

  const defaultMockSessions = {
    findByPhone: async () => null,
    startSession: async () => ({ session: {}, initialOutputs: [] }),
    resetSession: async () => ({ session: {}, initialOutputs: [] }),
    expireSession: async () => {},
    recordInvalidAttempt: async () => 1,
    resetInvalidAttempts: async () => {},
    touch: async () => {},
    ...mockSessions,
  };

  return new ConversationEngine(
    defaultMockSessions,
    translator,
    mockProvider,
    globalCommands,
    contextManager,
  );
};

describe('ConversationEngine', () => {
  it('should start a new session and return initial outputs when no session exists', async () => {
    let startSessionCalled = false;
    const mockSessions = {
      findByPhone: async () => null,
      startSession: async (phone) => {
        startSessionCalled = true;
        return {
          session: { id: 1, phone, typebotSessionId: 'sess_new_1', status: 'ACTIVE' },
          initialOutputs: [
            { type: CanonicalOutputType.TEXT, text: 'Bem vindo!' },
            {
              type: CanonicalOutputType.BUTTONS,
              options: [
                { id: '1', label: 'Opção 1', value: '1' },
                { id: '2', label: 'Opção 2', value: '2' },
              ],
            },
          ],
        };
      },
      touch: async () => {},
    };

    const mockProvider = {
      createSession: async () => ({ sessionId: 'sess_new_1' }),
      sendInput: async () => [],
    };

    const translator = new MessageTranslator();
    const engine = createEngine(mockSessions, translator, mockProvider);

    const outputs = await engine.handle({
      phone: '5511999998888',
      externalMessageId: 'msg_01',
      type: CanonicalInputType.TEXT,
      text: 'Oi',
      receivedAt: new Date(),
    });

    assert.equal(startSessionCalled, true);
    assert.equal(outputs.length, 2);
    assert.equal(outputs[0].type, CanonicalOutputType.TEXT);
    assert.equal(outputs[0].text, 'Bem vindo!');
    assert.equal(outputs[1].type, CanonicalOutputType.BUTTONS);
  });

  it('should continue existing session when active session is found in DB', async () => {
    let sendInputCalledWith = null;
    let touchCalled = false;

    const mockSessions = {
      findByPhone: async (phone) => ({
        id: 1,
        phone,
        typebotSessionId: 'sess_active_123',
        status: 'ACTIVE',
      }),
      touch: async () => {
        touchCalled = true;
      },
      resetInvalidAttempts: async () => {},
    };

    const mockProvider = {
      createSession: async () => ({ sessionId: 'sess_new' }),
      sendInput: async (sessionId, input) => {
        sendInputCalledWith = { sessionId, input };
        return [
          { type: CanonicalOutputType.TEXT, text: 'Você escolheu Opção 1' },
        ];
      },
    };

    const translator = new MessageTranslator();
    const engine = createEngine(mockSessions, translator, mockProvider);

    const outputs = await engine.handle({
      phone: '5511999998888',
      externalMessageId: 'msg_02',
      type: CanonicalInputType.TEXT,
      text: 'Opção 1',
      receivedAt: new Date(),
    });

    assert.equal(sendInputCalledWith.sessionId, 'sess_active_123');
    assert.equal(sendInputCalledWith.input.text, 'Opção 1');
    assert.equal(touchCalled, true);
    assert.equal(outputs.length, 1);
    assert.equal(outputs[0].text, 'Você escolheu Opção 1');
  });

  it('should terminate session when user sends SAIR command', async () => {
    let expiredPhone = null;
    const mockSessions = {
      findByPhone: async () => ({ status: 'ACTIVE' }),
      expireSession: async (phone) => {
        expiredPhone = phone;
      },
    };

    const mockProvider = {
      createSession: async () => ({ sessionId: 'sess_new' }),
      sendInput: async () => [],
    };

    const translator = new MessageTranslator();
    const engine = createEngine(mockSessions, translator, mockProvider);

    const outputs = await engine.handle({
      phone: '5511999998888',
      externalMessageId: 'msg_sair',
      type: CanonicalInputType.TEXT,
      text: 'sair',
      receivedAt: new Date(),
    });

    assert.equal(expiredPhone, '5511999998888');
    assert.equal(outputs.length, 1);
    assert.match(outputs[0].text, /encerrad[ao] com sucesso/i);
  });

  it('should terminate session after 3 consecutive invalid attempts', async () => {
    let expiredPhone = null;
    let attemptCounter = 0;

    const mockSessions = {
      findByPhone: async () => ({
        id: 1,
        phone: '5511999998888',
        typebotSessionId: 'sess_active_123',
        status: 'ACTIVE',
      }),
      recordInvalidAttempt: async () => ++attemptCounter,
      expireSession: async (phone) => {
        expiredPhone = phone;
      },
    };

    const mockProvider = {
      createSession: async () => ({ sessionId: 'sess_new' }),
      sendInput: async () => {
        throw new Error('Invalid input in Typebot');
      },
    };

    const translator = new MessageTranslator();
    const engine = createEngine(mockSessions, translator, mockProvider);

    // Tentativa 1
    const out1 = await engine.handle({
      phone: '5511999998888',
      externalMessageId: 'msg_err1',
      type: CanonicalInputType.TEXT,
      text: 'invalido 1',
      receivedAt: new Date(),
    });
    assert.match(out1[0].text, /Tentativa 1 de 3/);
    assert.equal(expiredPhone, null);

    // Tentativa 2
    const out2 = await engine.handle({
      phone: '5511999998888',
      externalMessageId: 'msg_err2',
      type: CanonicalInputType.TEXT,
      text: 'invalido 2',
      receivedAt: new Date(),
    });
    assert.match(out2[0].text, /Tentativa 2 de 3/);
    assert.equal(expiredPhone, null);

    // Tentativa 3 (Encerra)
    const out3 = await engine.handle({
      phone: '5511999998888',
      externalMessageId: 'msg_err3',
      type: CanonicalInputType.TEXT,
      text: 'invalido 3',
      receivedAt: new Date(),
    });
    assert.match(out3[0].text, /Sessão encerrada por excesso de tentativas/);
    assert.equal(expiredPhone, '5511999998888');
  });
});
