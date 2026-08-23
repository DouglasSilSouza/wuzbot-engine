import { Inject, Injectable, Logger } from '@nestjs/common';
import { WUZMIND_CLIENT, WuzMindClient } from './interfaces/wuzmind-client.interface';
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
} from './dto/wuzmind.dto';

@Injectable()
export class WuzMindService {
  private readonly logger = new Logger(WuzMindService.name);

  constructor(
    @Inject(WUZMIND_CLIENT) private readonly client: WuzMindClient,
  ) {}

  async classifyIntent(dto: IntentClassifyRequestDto): Promise<IntentClassifyResponseDto> {
    return this.client.classifyIntent(dto);
  }

  async recover(dto: RecoveryRequestDto): Promise<RecoveryResponseDto> {
    return this.client.recoverConversation(dto);
  }

  async detectHumanBehavior(dto: DetectHumanBehaviorDto): Promise<HumanBehaviorResponseDto> {
    return this.client.detectHumanBehavior(dto);
  }

  async classifyMedia(dto: MediaClassifyRequestDto): Promise<MediaClassifyResponseDto> {
    return this.client.classifyMedia(dto);
  }

  async getContext(phone: string): Promise<WuzMindContextDto | null> {
    return this.client.getContext(phone);
  }

  async syncContext(phone: string, dto: WuzMindContextDto): Promise<void> {
    try {
      await this.client.updateContext(phone, dto);
      this.logger.debug(`[WUZMIND_CONTEXT_SYNC] Synced context for ${phone}`);
    } catch (err) {
      this.logger.warn(`[WUZMIND_CONTEXT_SYNC] Failed to sync context for ${phone}: ${err}`);
    }
  }

  async clearRemoteContext(phone: string): Promise<void> {
    try {
      await this.client.deleteContext(phone);
      this.logger.debug(`[WUZMIND_CONTEXT_SYNC] Cleared remote context for ${phone}`);
    } catch (err) {
      this.logger.warn(`[WUZMIND_CONTEXT_SYNC] Failed to clear context for ${phone}: ${err}`);
    }
  }
}
