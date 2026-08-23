import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RecoveryModeService } from '../../dist/modules/recovery/recovery.service.js';
import { CanonicalOutputType } from '../../dist/modules/translation/canonical.types.js';
import { SuggestedActionEnum } from '../../dist/modules/wuzmind/enums/suggested-action.enum.js';

describe('RecoveryModeService', () => {
  let mockWuzmind;
  let service;

  beforeEach(() => {
    mockWuzmind = {
      recover: async () => ({
        action: SuggestedActionEnum.REDISPLAY_MENU,
        message: 'Entendi! Mas no momento estou aguardando você selecionar uma das opções abaixo:',
        matchedOption: null,
        intent: 'CONVERSA_GERAL',
        confidence: 0.90,
        provider: 'OPENAI',
      }),
    };
    service = new RecoveryModeService(mockWuzmind);
  });

  it('should call WuzMind recovery and return clean buttons with AI explanation', async () => {
    const options = [
      { id: '1', label: 'Registrar gasto', value: 'Registrar gasto' },
      { id: '2', label: 'Relatórios', value: 'Relatórios' },
    ];

    const decision = await service.handleRecovery('5511999998888', 'oi tudo bem', options);

    assert.equal(decision.outputs.length, 1);
    assert.equal(decision.outputs[0].type, CanonicalOutputType.BUTTONS);
    assert.match(decision.outputs[0].text, /aguardando você selecionar/i);
    assert.equal(decision.outputs[0].options.length, 2);
    assert.equal(decision.outputs[0].options[0].label, 'Registrar gasto');
    assert.equal(decision.matchedOption, null);
  });

  it('should identify and return matchedOption when user input matches semantically', async () => {
    mockWuzmind.recover = async () => ({
      action: SuggestedActionEnum.SELECT_OPTION,
      message: 'Selecionando Alimentação...',
      matchedOption: 'Alimentação',
      intent: 'ESCOLHA_MENU',
      confidence: 0.96,
      provider: 'OPENAI',
    });

    const options = [
      { id: 'cat_alim', label: 'Alimentação', value: 'Alimentação' },
      { id: 'cat_transp', label: 'Transporte', value: 'Transporte' },
    ];

    const decision = await service.handleRecovery('5511999998888', 'comida', options);

    assert.equal(decision.action, SuggestedActionEnum.SELECT_OPTION);
    assert.notEqual(decision.matchedOption, null);
    assert.equal(decision.matchedOption.label, 'Alimentação');
    assert.equal(decision.matchedOption.id, 'cat_alim');
  });

  it('should fallback to static message if WuzMind fails', async () => {
    mockWuzmind.recover = async () => {
      throw new Error('Connection refused');
    };

    const options = [
      { id: '1', label: 'Sim', value: 'Sim' },
      { id: '2', label: 'Não', value: 'Não' },
    ];

    const decision = await service.handleRecovery('5511999998888', 'qualquer coisa', options);

    assert.equal(decision.outputs.length, 1);
    assert.equal(decision.outputs[0].type, CanonicalOutputType.BUTTONS);
    assert.match(decision.outputs[0].text, /seleção de uma das opções/i);
    assert.equal(decision.outputs[0].options.length, 2);
    assert.equal(decision.matchedOption, null);
  });
});
