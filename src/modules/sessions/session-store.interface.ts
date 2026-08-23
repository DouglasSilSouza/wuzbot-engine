import { TechnicalSessionEntity } from './session.entity';
export const SESSION_STORE = Symbol('SESSION_STORE');
export interface SessionStore { findByPhone(phone: string): Promise<TechnicalSessionEntity | null>; save(session: Partial<TechnicalSessionEntity>): Promise<TechnicalSessionEntity>; touch(phone: string): Promise<void> }
