export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');
export interface IdempotencyStore { hasProcessed(externalMessageId: string): Promise<boolean>; markProcessed(externalMessageId: string, phone: string, correlationId: string): Promise<void>; }
