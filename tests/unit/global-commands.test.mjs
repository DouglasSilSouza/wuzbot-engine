import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GlobalCommandService } from '../../dist/modules/commands/global-command.service.js';

describe('GlobalCommandService', () => {
  const service = new GlobalCommandService();

  describe('MENU command', () => {
    it('should detect MENU variations locally', () => {
      const inputs = ['menu', 'MENU', '/menu', 'início', 'inicio', 'reiniciar', 'voltar ao começo', 'voltar', 'começar'];
      for (const input of inputs) {
        const result = service.detect(input);
        assert.equal(result.isGlobalCommand, true, `Failed for input: ${input}`);
        assert.equal(result.command, 'MENU');
      }
    });
  });

  describe('SAIR command', () => {
    it('should detect SAIR variations locally', () => {
      const inputs = ['sair', 'SAIR', '/sair', 'cancelar', 'encerrar', 'finalizar', 'tchau', 'parar'];
      for (const input of inputs) {
        const result = service.detect(input);
        assert.equal(result.isGlobalCommand, true, `Failed for input: ${input}`);
        assert.equal(result.command, 'SAIR');
        assert.match(result.responseMessage, /encerrada com sucesso/i);
      }
    });
  });

  describe('AJUDA command', () => {
    it('should detect AJUDA variations locally', () => {
      const inputs = ['ajuda', 'AJUDA', 'help', '/help', 'como funciona', 'socorro', 'comandos'];
      for (const input of inputs) {
        const result = service.detect(input);
        assert.equal(result.isGlobalCommand, true, `Failed for input: ${input}`);
        assert.equal(result.command, 'AJUDA');
        assert.match(result.responseMessage, /Comandos R[aá]pidos/i);
      }
    });
  });

  describe('CONTINUAR command', () => {
    it('should detect CONTINUAR variations locally', () => {
      const inputs = ['continuar', 'CONTINUAR', 'retomar', 'seguir'];
      for (const input of inputs) {
        const result = service.detect(input);
        assert.equal(result.isGlobalCommand, true, `Failed for input: ${input}`);
        assert.equal(result.command, 'CONTINUAR');
      }
    });
  });

  describe('Non-global inputs', () => {
    it('should return isGlobalCommand false for conversational text', () => {
      const inputs = ['gastei 50 no mercado', 'quanto gastei esse mês?', 'quero o nubank', 'olá tudo bem'];
      for (const input of inputs) {
        const result = service.detect(input);
        assert.equal(result.isGlobalCommand, false, `Failed for input: ${input}`);
      }
    });
  });
});
