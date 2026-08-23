export enum CanonicalInputType { TEXT='TEXT', BUTTON_REPLY='BUTTON_REPLY', LIST_REPLY='LIST_REPLY', IMAGE='IMAGE', DOCUMENT='DOCUMENT', AUDIO='AUDIO', VIDEO='VIDEO', STICKER='STICKER' }
export enum CanonicalOutputType { TEXT='TEXT', BUTTONS='BUTTONS', LIST='LIST', IMAGE='IMAGE', DOCUMENT='DOCUMENT', AUDIO='AUDIO', VIDEO='VIDEO', STICKER='STICKER' }
export interface CanonicalOption { id: string; label: string; value: string }
export interface CanonicalMedia { mediaId?: string; mimeType?: string; fileName?: string; size?: number; url?: string; caption?: string; checksum?: string }
export interface CanonicalUserInput { phone: string; externalMessageId: string; type: CanonicalInputType; text?: string; selection?: CanonicalOption; media?: CanonicalMedia; receivedAt: Date; metadata?: Record<string, unknown> }
export interface CanonicalOutput { type: CanonicalOutputType; text?: string; options?: CanonicalOption[]; media?: CanonicalMedia; metadata?: Record<string, unknown> }
