export const PHONE_LOCK = Symbol('PHONE_LOCK');
export interface PhoneLock { runExclusive<T>(phone: string, operation: () => Promise<T>): Promise<T>; }
