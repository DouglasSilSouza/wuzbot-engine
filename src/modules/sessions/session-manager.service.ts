import { Inject, Injectable } from '@nestjs/common';
import { CONVERSATION_PROVIDER, ConversationProvider } from '../typebot/conversation-provider.interface';
import { CanonicalOutput } from '../translation/canonical.types';
import { TechnicalSessionEntity } from './session.entity';
import { SESSION_STORE, SessionStore } from './session-store.interface';

export interface StartedSessionResult {
  session: TechnicalSessionEntity;
  initialOutputs: CanonicalOutput[];
}

@Injectable()
export class SessionManager {
  constructor(
    @Inject(SESSION_STORE) private readonly store: SessionStore,
    @Inject(CONVERSATION_PROVIDER) private readonly provider: ConversationProvider,
  ) {}

  async findByPhone(phone: string): Promise<TechnicalSessionEntity | null> {
    return this.store.findByPhone(phone);
  }

  async startSession(
    phone: string,
    options?: { prefilledVariables?: Record<string, string> },
  ): Promise<StartedSessionResult> {
    const current = await this.store.findByPhone(phone);
    const remote = await this.provider.createSession(phone, options);
    const session = await this.store.save({
      ...(current ? { id: current.id } : {}),
      phone,
      typebotSessionId: remote.sessionId,
      typebotUserId: remote.providerUserId ?? null,
      status: 'ACTIVE',
      lastInteractionAt: new Date(),
    });
    return { session, initialOutputs: remote.initialOutputs ?? [] };
  }

  async resetSession(
    phone: string,
    options?: { prefilledVariables?: Record<string, string> },
  ): Promise<StartedSessionResult> {
    return this.startSession(phone, options);
  }

  async getOrCreate(phone: string): Promise<TechnicalSessionEntity> {
    const current = await this.store.findByPhone(phone);
    if (current?.typebotSessionId && current.status === 'ACTIVE') return current;
    const { session } = await this.startSession(phone);
    return session;
  }

  async touch(phone: string): Promise<void> {
    await this.store.touch(phone);
  }
}
