import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONVERSATION_PROVIDER, ConversationProvider } from '../typebot/conversation-provider.interface';
import { CanonicalOutput } from '../translation/canonical.types';
import { TechnicalSessionEntity } from './session.entity';
import { SESSION_STORE, SessionStore } from './session-store.interface';

export interface StartedSessionResult {
  session: TechnicalSessionEntity;
  initialOutputs: CanonicalOutput[];
}

export const SESSION_INACTIVITY_TTL_MS = 30 * 60 * 1000; // 30 minutos

@Injectable()
export class SessionManager {
  private readonly logger = new Logger(SessionManager.name);

  constructor(
    @Inject(SESSION_STORE) private readonly store: SessionStore,
    @Inject(CONVERSATION_PROVIDER) private readonly provider: ConversationProvider,
  ) {}

  async findByPhone(phone: string): Promise<TechnicalSessionEntity | null> {
    const session = await this.store.findByPhone(phone);
    if (!session) return null;

    // Regra: Mais de 30 minutos inativo encerra a sessão
    if (session.status === 'ACTIVE' && session.lastInteractionAt) {
      const elapsedMs = Date.now() - new Date(session.lastInteractionAt).getTime();
      if (elapsedMs > SESSION_INACTIVITY_TTL_MS) {
        this.logger.log(`[SESSION_EXPIRED] Inactive for ${(elapsedMs / 60000).toFixed(1)}min (>30min). Expiring session for ${phone}.`);
        session.status = 'EXPIRED';
        await this.store.save({ id: session.id, status: 'EXPIRED' });
        return null;
      }
    }

    return session;
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
      metadata: { invalidAttempts: 0 },
    });
    return { session, initialOutputs: remote.initialOutputs ?? [] };
  }

  async resetSession(
    phone: string,
    options?: { prefilledVariables?: Record<string, string> },
  ): Promise<StartedSessionResult> {
    return this.startSession(phone, options);
  }

  async expireSession(phone: string): Promise<void> {
    const current = await this.store.findByPhone(phone);
    if (current) {
      await this.store.save({ id: current.id, status: 'EXPIRED' });
    }
  }

  async recordInvalidAttempt(phone: string): Promise<number> {
    const current = await this.store.findByPhone(phone);
    if (!current) return 1;
    const metadata = (current.metadata || {}) as { invalidAttempts?: number };
    const newCount = (metadata.invalidAttempts || 0) + 1;
    await this.store.save({
      id: current.id,
      metadata: { ...metadata, invalidAttempts: newCount },
    });
    return newCount;
  }

  async resetInvalidAttempts(phone: string): Promise<void> {
    const current = await this.store.findByPhone(phone);
    if (current) {
      const metadata = (current.metadata || {}) as { invalidAttempts?: number };
      if (metadata.invalidAttempts && metadata.invalidAttempts > 0) {
        await this.store.save({
          id: current.id,
          metadata: { ...metadata, invalidAttempts: 0 },
        });
      }
    }
  }

  async getOrCreate(phone: string): Promise<TechnicalSessionEntity> {
    const current = await this.findByPhone(phone);
    if (current?.typebotSessionId && current.status === 'ACTIVE') return current;
    const { session } = await this.startSession(phone);
    return session;
  }

  async touch(phone: string): Promise<void> {
    await this.store.touch(phone);
  }
}
