import {
  DetectHumanBehaviorDto,
  HumanBehaviorResponseDto,
  IntentClassifyRequestDto,
  IntentClassifyResponseDto,
  MediaClassifyRequestDto,
  MediaClassifyResponseDto,
  RecoveryRequestDto,
  RecoveryResponseDto,
  WuzMindContextDto,
} from '../dto/wuzmind.dto';

export const WUZMIND_CLIENT = Symbol('WUZMIND_CLIENT');

export interface WuzMindClient {
  health(): Promise<{ status: string; providers?: Record<string, unknown> }>;
  classifyIntent(dto: IntentClassifyRequestDto): Promise<IntentClassifyResponseDto>;
  recoverConversation(dto: RecoveryRequestDto): Promise<RecoveryResponseDto>;
  detectHumanBehavior(dto: DetectHumanBehaviorDto): Promise<HumanBehaviorResponseDto>;
  classifyMedia(dto: MediaClassifyRequestDto): Promise<MediaClassifyResponseDto>;
  getContext(phone: string): Promise<WuzMindContextDto | null>;
  updateContext(phone: string, dto: WuzMindContextDto): Promise<WuzMindContextDto>;
  deleteContext(phone: string): Promise<boolean>;
}
