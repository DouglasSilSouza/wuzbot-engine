import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IntentRoutingService } from '../../dist/modules/routing/intent-routing.service.js';
import { TypebotIntentMapper } from '../../dist/modules/routing/typebot-intent.mapper.js';
import { WuzMindConfig } from '../../dist/modules/wuzmind/wuzmind.config.js';
import { IntentEnum } from '../../dist/modules/wuzmind/enums/intent.enum.js';
import { SuggestedActionEnum } from '../../dist/modules/wuzmind/enums/suggested-action.enum.js';

describe('IntentRoutingService', () => {
  let mapper;
  let config;
  let mockWuzmind;
  let service;

  beforeEach(() => {
    mapper = new TypebotIntentMapper();
    config = new WuzMindConfig({
      get: (k, def) => (k === 'WUZMIND_MIN_CONFIDENCE' ? '0.65' : def),
    });
    mockWuzmind = {
      classifyIntent: async () => ({
        intent: IntentEnum.REGISTRAR_GASTO,
        confidence: 0.92,
        entities: { value: '45.00', category: 'Alimentação', description: 'Almoço' },
        suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
        targetFlow: 'GASTOS',
        provider: 'OLLAMA',
      }),
    };
    service = new IntentRoutingService(mockWuzmind, mapper, config);
  });

  describe('High Confidence Routing', () => {
    it('should route high confidence intent and map prefilled variables', async () => {
      const decision = await service.evaluate('5511999998888', 'gastei 45 no almoço');
      assert.equal(decision.shouldRoute, true);
      assert.equal(decision.action, SuggestedActionEnum.START_TYPEBOT_FLOW);
      assert.equal(decision.mapped.targetFlow, 'GASTOS');
      assert.equal(decision.mapped.prefilledVariables.Phone, '5511999998888');
      assert.equal(decision.mapped.prefilledVariables.Valor, '45.00');
      assert.equal(decision.mapped.prefilledVariables.Categoria, 'Alimentação');
      assert.equal(decision.mapped.prefilledVariables.Descricao, 'Almoço');
    });

    it('should extract bank and period for report intent', async () => {
      mockWuzmind.classifyIntent = async () => ({
        intent: IntentEnum.CONSULTAR_RELATORIO,
        confidence: 0.98,
        entities: { bank: 'NUBANK', period: 'MES_ATUAL' },
        suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
        targetFlow: 'RELATORIOS',
        provider: 'OLLAMA',
      });

      const decision = await service.evaluate('5511999998888', 'quero relatório do nubank deste mês');
      assert.equal(decision.shouldRoute, true);
      assert.equal(decision.mapped.targetFlow, 'RELATORIOS');
      assert.equal(decision.mapped.prefilledVariables.Banco, 'NUBANK');
      assert.equal(decision.mapped.prefilledVariables.Mes, 'MES_ATUAL');
    });
  });

  describe('Low Confidence & Unallowed Flow Rejection', () => {
    it('should reject route when confidence is below threshold', async () => {
      mockWuzmind.classifyIntent = async () => ({
        intent: IntentEnum.REGISTRAR_GASTO,
        confidence: 0.40,
        entities: {},
        suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
        provider: 'OLLAMA',
      });

      const decision = await service.evaluate('5511999998888', 'algo confuso');
      assert.equal(decision.shouldRoute, false);
      assert.equal(decision.action, SuggestedActionEnum.REDISPLAY_MENU);
    });

    it('should reject route when intent is outside allowed flows allowlist', async () => {
      mockWuzmind.classifyIntent = async () => ({
        intent: IntentEnum.CONVERSA_GERAL,
        confidence: 0.95,
        entities: {},
        suggestedAction: SuggestedActionEnum.NO_ACTION,
        provider: 'OLLAMA',
      });

      const decision = await service.evaluate('5511999998888', 'qual a capital da França?');
      assert.equal(decision.shouldRoute, false);
      assert.equal(decision.action, SuggestedActionEnum.REDISPLAY_MENU);
    });
  });
});
