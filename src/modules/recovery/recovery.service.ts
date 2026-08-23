import { Injectable, Logger } from '@nestjs/common';
import { WuzMindService } from '../wuzmind/wuzmind.service';
import { RecoveryRequestDto, RecoveryResponseDto } from '../wuzmind/dto/wuzmind.dto';
import { CanonicalOption, CanonicalOutput, CanonicalOutputType } from '../translation/canonical.types';
import { SuggestedActionEnum } from '../wuzmind/enums/suggested-action.enum';

export interface RecoveryDecision {
  action: SuggestedActionEnum;
  matchedOption?: CanonicalOption | null;
  outputs: CanonicalOutput[];
  rawResponse: RecoveryResponseDto;
}

@Injectable()
export class RecoveryModeService {
  private readonly logger = new Logger(RecoveryModeService.name);

  constructor(private readonly wuzmind: WuzMindService) {}

  async handleRecovery(
    phone: string,
    message: string,
    options: CanonicalOption[],
    context?: Record<string, unknown>,
  ): Promise<RecoveryDecision> {
    this.logger.log(`[WUZMIND_RECOVERY] Triggering recovery assistant for ${phone}`);

    const dto: RecoveryRequestDto = {
      phone,
      message,
      text: message,
      currentState: 'WAITING_CHOICE',
      waitingFor: 'options_selection',
      availableOptions: options.map((opt) => opt.label || opt.value || opt.id),
      context,
    };

    let recoveryResult: RecoveryResponseDto;
    try {
      recoveryResult = await this.wuzmind.recover(dto);
    } catch {
      recoveryResult = {
        action: SuggestedActionEnum.STATIC_FALLBACK,
        message:
          'Estou aguardando a seleção de uma das opções abaixo para continuarmos.\n\nDigite MENU para voltar ao início.',
        intent: 'FORA_DE_ESCOPO',
        confidence: 0,
        provider: 'STATIC_FALLBACK',
      };
    }

    // Check if WuzMind matched an option from the menu (e.g. user typed "comida" -> "Alimentação")
    let matchedOption: CanonicalOption | null = null;
    if (recoveryResult.matchedOption) {
      const target = recoveryResult.matchedOption.trim().toLowerCase();
      matchedOption =
        options.find(
          (opt) =>
            opt.label.trim().toLowerCase() === target ||
            opt.value?.trim().toLowerCase() === target ||
            opt.id.toLowerCase() === target,
        ) ??
        options.find(
          (opt) =>
            opt.label.toLowerCase().includes(target) ||
            target.includes(opt.label.toLowerCase()),
        ) ??
        null;

      if (matchedOption) {
        this.logger.log(
          `[WUZMIND_RECOVERY] Matched user input "${message}" to option "${matchedOption.label}" (${matchedOption.id})`,
        );
      }
    }

    const outputType =
      options.length <= 3 ? CanonicalOutputType.BUTTONS : CanonicalOutputType.LIST;

    this.logger.log(
      `[WUZMIND_RECOVERY] Action: ${recoveryResult.action} (matched: ${
        matchedOption?.label ?? 'none'
      }, provider: ${recoveryResult.provider})`,
    );

    return {
      action: recoveryResult.action,
      matchedOption,
      rawResponse: recoveryResult,
      outputs: [
        {
          type: outputType,
          text:
            recoveryResult.message ||
            'Estou aguardando a seleção de uma opção abaixo para continuarmos:',
          options,
        },
      ],
    };
  }
}
