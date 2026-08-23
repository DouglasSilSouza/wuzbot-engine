import { Injectable, Logger } from '@nestjs/common';
import { WuzMindService } from '../wuzmind/wuzmind.service';
import { TypebotIntentMapper, TypebotMappedIntent } from './typebot-intent.mapper';
import { IntentClassifyRequestDto } from '../wuzmind/dto/wuzmind.dto';
import { WuzMindConfig } from '../wuzmind/wuzmind.config';
import { SuggestedActionEnum } from '../wuzmind/enums/suggested-action.enum';

export interface IntentRoutingDecision {
  shouldRoute: boolean;
  action: SuggestedActionEnum;
  mapped?: TypebotMappedIntent;
  confidence: number;
}

@Injectable()
export class IntentRoutingService {
  private readonly logger = new Logger(IntentRoutingService.name);

  constructor(
    private readonly wuzmind: WuzMindService,
    private readonly mapper: TypebotIntentMapper,
    private readonly config: WuzMindConfig,
  ) {}

  async evaluate(
    phone: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<IntentRoutingDecision> {
    if (!this.config.enabled) {
      return {
        shouldRoute: false,
        action: SuggestedActionEnum.NO_ACTION,
        confidence: 0,
      };
    }

    const dto: IntentClassifyRequestDto = {
      phone,
      message,
      text: message,
      context,
    };

    const response = await this.wuzmind.classifyIntent(dto);

    if (response.confidence < this.config.minConfidence) {
      this.logger.log(
        `[WUZMIND_ROUTE_REJECTED] Low confidence (${response.confidence} < ${this.config.minConfidence}) for intent ${response.intent}`,
      );
      return {
        shouldRoute: false,
        action: SuggestedActionEnum.REDISPLAY_MENU,
        confidence: response.confidence,
      };
    }

    const mapped = this.mapper.map(response, phone);

    if (!mapped.isAllowed) {
      this.logger.warn(
        `[WUZMIND_ROUTE_REJECTED] Target intent ${response.intent} is not in allowed flows allowlist`,
      );
      return {
        shouldRoute: false,
        action: SuggestedActionEnum.REDISPLAY_MENU,
        confidence: response.confidence,
      };
    }

    this.logger.log(
      `[WUZMIND_ROUTE_ACCEPTED] Accepted intent ${response.intent} (confidence: ${response.confidence}) -> targetFlow: ${mapped.targetFlow}`,
    );

    return {
      shouldRoute: true,
      action: response.suggestedAction ?? SuggestedActionEnum.START_TYPEBOT_FLOW,
      mapped,
      confidence: response.confidence,
    };
  }
}
