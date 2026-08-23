import { Injectable } from '@nestjs/common';
import { IntentEnum } from '../wuzmind/enums/intent.enum';
import { IntentClassifyResponseDto } from '../wuzmind/dto/wuzmind.dto';

export interface TypebotMappedIntent {
  isAllowed: boolean;
  intent: IntentEnum;
  targetFlow: string | null;
  prefilledVariables: Record<string, string>;
}

@Injectable()
export class TypebotIntentMapper {
  private readonly ALLOWED_FLOWS: Record<string, string> = {
    [IntentEnum.REGISTRAR_GASTO]: 'GASTOS',
    [IntentEnum.REGISTRAR_ENTRADA]: 'ENTRADAS',
    [IntentEnum.CONSULTAR_RELATORIO]: 'RELATORIOS',
    [IntentEnum.ENVIAR_COMPROVANTE]: 'CONFIRMAR_COMPROVANTE',
  };

  map(response: IntentClassifyResponseDto, phone: string): TypebotMappedIntent {
    const targetFlow = this.ALLOWED_FLOWS[response.intent] ?? response.targetFlow ?? null;
    const isAllowed = Boolean(this.ALLOWED_FLOWS[response.intent]);

    const prefilledVariables: Record<string, string> = {
      Phone: phone,
      Channel: 'whatsapp',
      Intent: response.intent,
    };

    if (response.entities) {
      if (response.entities.bank) {
        prefilledVariables.Banco = String(response.entities.bank).toUpperCase();
      }
      if (response.entities.period || response.entities.month) {
        prefilledVariables.Mes = String(
          response.entities.period ?? response.entities.month,
        );
      }
      if (response.entities.value || response.entities.amount) {
        prefilledVariables.Valor = String(
          response.entities.value ?? response.entities.amount,
        );
      }
      if (response.entities.category) {
        prefilledVariables.Categoria = String(response.entities.category);
      }
      if (response.entities.description) {
        prefilledVariables.Descricao = String(response.entities.description);
      }
    }

    return {
      isAllowed,
      intent: response.intent,
      targetFlow,
      prefilledVariables,
    };
  }
}
