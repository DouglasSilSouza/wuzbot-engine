import { Injectable, Logger } from '@nestjs/common';
import { WuzMindService } from '../wuzmind/wuzmind.service';
import { CanonicalUserInput, CanonicalOutput, CanonicalOutputType } from '../translation/canonical.types';
import { MediaClassifyRequestDto, MediaClassifyResponseDto } from '../wuzmind/dto/wuzmind.dto';
import { MediaClassificationEnum } from '../wuzmind/enums/media-classification.enum';
import { SuggestedActionEnum } from '../wuzmind/enums/suggested-action.enum';

@Injectable()
export class WuzMindMediaRoutingService {
  private readonly logger = new Logger(WuzMindMediaRoutingService.name);

  constructor(private readonly wuzmind: WuzMindService) {}

  async classifyAndRoute(input: CanonicalUserInput): Promise<{
    decision: MediaClassifyResponseDto;
    userOutputs?: CanonicalOutput[];
  }> {
    const dto: MediaClassifyRequestDto = {
      phone: input.phone,
      mediaType: input.type,
      mimeType: input.media?.mimeType,
      fileName: input.media?.fileName,
      caption: input.text ?? input.media?.caption,
      url: input.media?.url,
    };

    this.logger.log(
      `[WUZMIND_MEDIA_ROUTER] Classifying media for phone ${input.phone} (type: ${input.type})`,
    );

    const decision = await this.wuzmind.classifyMedia(dto);

    this.logger.log(
      `[WUZMIND_MEDIA_ROUTER] Result: ${decision.classification} (confidence: ${decision.confidence}, action: ${decision.suggestedAction})`,
    );

    let userOutputs: CanonicalOutput[] | undefined;

    if (decision.classification === MediaClassificationEnum.COMPROVANTE) {
      userOutputs = [
        {
          type: CanonicalOutputType.BUTTONS,
          text: '📄 *Comprovante identificado!*\n\nDeseja registrar esta despesa no sistema?',
          options: [
            { id: 'btn_confirmar_gasto', label: 'Registrar Gasto', value: 'Registrar gasto' },
            { id: 'btn_menu_principal', label: 'Menu Principal', value: 'MENU' },
          ],
        },
      ];
    } else if (
      decision.classification === MediaClassificationEnum.AUDIO_DESPESA ||
      decision.classification === MediaClassificationEnum.AUDIO_DUVIDA
    ) {
      userOutputs = [
        {
          type: CanonicalOutputType.TEXT,
          text: '🎙️ Áudio recebido! Estamos preparando o processamento de áudio para as próximas etapas.',
        },
      ];
    }

    return { decision, userOutputs };
  }
}
