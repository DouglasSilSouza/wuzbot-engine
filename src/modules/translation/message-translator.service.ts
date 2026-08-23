import { Injectable, Logger } from '@nestjs/common';
import { CanonicalOutput, CanonicalOutputType } from './canonical.types';

@Injectable()
export class MessageTranslator {
  private readonly logger = new Logger(MessageTranslator.name);

  fromTypebot(output: CanonicalOutput): CanonicalOutput {
    if (output.options?.length) {
      const semanticType = output.options.length <= 3 ? CanonicalOutputType.BUTTONS : CanonicalOutputType.LIST;
      this.logger.debug(`[MessageTranslator] Translating choice (${output.options.length} options) -> ${semanticType}`);
      return {
        ...output,
        type: semanticType,
      };
    }
    return output;
  }
}


