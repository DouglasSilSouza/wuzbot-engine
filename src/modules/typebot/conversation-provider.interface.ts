import { CanonicalOutput, CanonicalUserInput } from '../translation/canonical.types';

export const CONVERSATION_PROVIDER = Symbol('CONVERSATION_PROVIDER');

export interface ConversationSession {
  sessionId: string;
  providerUserId?: string;
  initialOutputs?: CanonicalOutput[];
}

export interface ConversationProvider {
  createSession(
    phone: string,
    options?: { prefilledVariables?: Record<string, string> },
  ): Promise<ConversationSession>;
  sendInput(sessionId: string, input: CanonicalUserInput): Promise<CanonicalOutput[]>;
}
