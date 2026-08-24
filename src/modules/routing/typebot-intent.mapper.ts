import { Injectable, Logger } from '@nestjs/common';
import { IntentEnum } from '../wuzmind/enums/intent.enum';
import { IntentClassifyResponseDto } from '../wuzmind/dto/wuzmind.dto';
import * as fs from 'fs';
import * as path from 'path';

export interface TypebotMappedIntent {
  isAllowed: boolean;
  intent: IntentEnum | string;
  targetFlow: string | null;
  prefilledVariables: Record<string, string>;
}

@Injectable()
export class TypebotIntentMapper {
  private readonly logger = new Logger(TypebotIntentMapper.name);

  private getDynamicSchema() {
    try {
      const schemaPath = process.env.DYNAMIC_SCHEMA_PATH || '/opt/gastoapp/envs/dynamic-schema.json';
      if (fs.existsSync(schemaPath)) {
        return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      }
      const localPath = path.join(process.cwd(), 'dynamic-schema.json');
      if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, 'utf8'));
      }
    } catch (e) {
      this.logger.error('Failed to load dynamic schema:', e);
    }
    return null;
  }

  map(response: IntentClassifyResponseDto, phone: string): TypebotMappedIntent {
    let targetFlow = response.targetFlow ?? null;
    let isAllowed = false;

    const schema = this.getDynamicSchema();
    if (schema && schema.flows) {
      const flowMatch = schema.flows.find((f: any) => f.intent === response.intent);
      if (flowMatch) {
        targetFlow = flowMatch.typebotFlowName || targetFlow;
        isAllowed = true;
      }
    } else {
      // Fallback to legacy if schema is missing
      const legacyFlows: Record<string, string> = {
        'REGISTRAR_GASTO': 'GASTOS',
        'REGISTRAR_ENTRADA': 'ENTRADAS',
        'CONSULTAR_RELATORIO': 'RELATORIOS',
        'ENVIAR_COMPROVANTE': 'CONFIRMAR_COMPROVANTE',
      };
      targetFlow = legacyFlows[response.intent] ?? targetFlow;
      isAllowed = Boolean(legacyFlows[response.intent]);
    }

    const prefilledVariables: Record<string, string> = {
      Phone: phone,
      Channel: 'whatsapp',
      Intent: response.intent as string,
    };

    if (response.entities) {
      for (const [key, value] of Object.entries(response.entities)) {
        if (value !== null && value !== undefined) {
          // Normalize legacy keys if Wuzmind uses old schema
          if (key === 'bank') prefilledVariables.Banco = String(value).toUpperCase();
          else if (key === 'period' || key === 'month') prefilledVariables.Mes = String(value);
          else if (key === 'value' || key === 'amount') prefilledVariables.Valor = String(value);
          else if (key === 'category') prefilledVariables.Categoria = String(value);
          else if (key === 'description') prefilledVariables.Descricao = String(value);
          else {
            // Dynamic variable!
            prefilledVariables[key] = String(value);
          }
        }
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
