import { Injectable, Logger } from '@nestjs/common';
import { WuzMindService } from '../wuzmind/wuzmind.service';
import { HumanBehaviorCategoryEnum } from '../wuzmind/enums/human-behavior-category.enum';

export interface HumanBehaviorResult {
  isHumanBehavior: boolean;
  category?: HumanBehaviorCategoryEnum | null;
  replyMessage?: string | null;
}

@Injectable()
export class HumanBehaviorService {
  private readonly logger = new Logger(HumanBehaviorService.name);

  private readonly GREETING_REGEX =
    /^(oi|ol[aá]|ola|e\s*a[ií]|opa|fala\s*a[ií]|bom\s*dia|boa\s*tarde|boa\s*noite|salve|beleza|tudo\s*bem|td\s*bem)($|\s|[!.,?])/iu;

  private readonly THANKS_REGEX =
    /^(obrigad[oa]|valeu|vlw|agrade[cç]o|muito\s*obrigad[oa]|show|perfeito|maravilha)($|\s|[!.,?])/iu;

  private readonly LAUGHTER_REGEX =
    /^(k{2,}|(ha){2,}|(he){2,}|(rs){2,}|haha+|kkk+)($|\s|[!.,?])/iu;

  constructor(private readonly wuzmind: WuzMindService) {}

  async detect(text?: string | null): Promise<HumanBehaviorResult> {
    if (!text || typeof text !== 'string') {
      return { isHumanBehavior: false };
    }

    const trimmed = text.trim();

    // 1. Fast Local Rules (No AI overhead)
    if (this.GREETING_REGEX.test(trimmed)) {
      this.logger.debug(`[HUMAN_BEHAVIOR] Resolved locally as GREETING: "${trimmed}"`);
      return {
        isHumanBehavior: true,
        category: HumanBehaviorCategoryEnum.GREETING,
        replyMessage: 'Olá! Como posso ajudar você hoje?',
      };
    }

    if (this.THANKS_REGEX.test(trimmed)) {
      this.logger.debug(`[HUMAN_BEHAVIOR] Resolved locally as THANKS: "${trimmed}"`);
      return {
        isHumanBehavior: true,
        category: HumanBehaviorCategoryEnum.THANKS,
        replyMessage: 'Por nada! Se precisar de algo mais, é só me chamar.',
      };
    }

    if (this.LAUGHTER_REGEX.test(trimmed)) {
      this.logger.debug(`[HUMAN_BEHAVIOR] Resolved locally as LAUGHTER: "${trimmed}"`);
      return {
        isHumanBehavior: true,
        category: HumanBehaviorCategoryEnum.LAUGHTER,
        replyMessage: '😄 Se precisar de ajuda com seus gastos ou relatórios, é só avisar!',
      };
    }

    // 2. Secondary fallback to WuzMind detect endpoint if needed
    try {
      const res = await this.wuzmind.detectHumanBehavior({ message: trimmed, text: trimmed });
      if (res.isHumanBehavior) {
        this.logger.debug(
          `[HUMAN_BEHAVIOR] Resolved via WuzMind as ${res.category}: "${trimmed}"`,
        );
        return {
          isHumanBehavior: true,
          category: res.category,
          replyMessage: res.suggestedMessage ?? 'Estou aqui para ajudar!',
        };
      }
    } catch {
      // Ignored - fallback to false
    }

    return { isHumanBehavior: false };
  }
}
