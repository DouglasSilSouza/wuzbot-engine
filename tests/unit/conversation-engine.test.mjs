import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { ConversationEngine } from '../../dist/modules/engine/conversation-engine.service.js';
import { MessageTranslator } from '../../dist/modules/translation/message-translator.service.js';
import { CanonicalInputType, CanonicalOutputType } from '../../dist/modules/translation/canonical.types.js';
import { GlobalCommandService } from '../../dist/modules/commands/global-command.service.js';

const createEngine = (mockSessions, translator, mockProvider, overrides = {}) => {
  const globalCommands = overrides.globalCommands ?? new GlobalCommandService();
  const intentRouter = overrides.intentRouter ?? {
    evaluate: async () => ({ shouldRoute: false }),
  };
  const mediaRouter = overrides.mediaRouter ?? {
    classifyAndRoute: async () => ({}),
  };
  const contextManager = overrides.contextManager ?? {
    setLastIntent: async () => ({}),
  };
  const contextSync = overrides.contextSync ?? {
    clearBoth: async () => {},
    syncToRemote: async () => {},
  };
  const userAccess = overrides.userAccess ?? {
    isAuthorized: async () => true,
  };

  return new ConversationEngine(
    mockSessions,
    translator,
    mockProvider,
    globalCommands,
    mediaRouter,
    contextManager,
    contextSync,
    userAccess,
    intentRouter,
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

  it('should seamlessly restart session when continueChat throws 404 Session Not Found', async () => {
    let resetSessionCalled = false;

    const mockSessions = {
      findByPhone: async (phone) => ({
        id: 1,
        phone,
        typebotSessionId: 'sess_expired_999',
        status: 'ACTIVE',
      }),
      resetSession: async (phone) => {
        resetSessionCalled = true;
        return {
          session: { id: 1, phone, typebotSessionId: 'sess_renewed_111', status: 'ACTIVE' },
          initialOutputs: [
            { type: CanonicalOutputType.TEXT, text: 'Sua sessão anterior expirou. Bem vindo novamente!' },
          ],
        };
      },
      touch: async () => {},
    };

    const mockProvider = {
      createSession: async () => ({ sessionId: 'sess_renewed_111' }),
      sendInput: async () => {
        throw new NotFoundException('Session not found');
      },
    };

    const translator = new MessageTranslator();
    const engine = createEngine(mockSessions, translator, mockProvider);

    const outputs = await engine.handle({
      phone: '5511999998888',
      externalMessageId: 'msg_03',
      type: CanonicalInputType.TEXT,
      text: 'Olá',
      receivedAt: new Date(),
    });

    assert.equal(resetSessionCalled, true);
    assert.equal(outputs.length, 1);
    assert.equal(outputs[0].text, 'Sua sessão anterior expirou. Bem vindo novamente!');
  });
});
