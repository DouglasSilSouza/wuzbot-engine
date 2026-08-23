import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ContextManagerService } from '../../dist/modules/context/context-manager.service.js';

describe('ContextManagerService', () => {
  let service;
  let inMemoryDb = new Map();

  const mockRepository = {
    findOne: async ({ where }) => {
      const found = inMemoryDb.get(where.phone);
      return found ? { ...found } : null;
    },
    create: (data) => ({
      id: Math.floor(Math.random() * 1000) + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }),
    save: async (entity) => {
      const saved = { ...entity, updatedAt: new Date() };
      inMemoryDb.set(saved.phone, saved);
      return { ...saved };
    },
    delete: async ({ phone }) => {
      const existed = inMemoryDb.has(phone);
      inMemoryDb.delete(phone);
      return { affected: existed ? 1 : 0 };
    },
  };

  beforeEach(() => {
    inMemoryDb.clear();
    service = new ContextManagerService(mockRepository);
  });

  describe('getOrCreate', () => {
    it('should create a new context with default values when phone does not exist', async () => {
      const context = await service.getOrCreate('5511999998888');
      assert.equal(context.phone, '5511999998888');
      assert.equal(context.currentState, 'IDLE');
      assert.equal(context.sessionStatus, 'ACTIVE');
      assert.equal(context.lastIntent, null);
      assert.equal(context.lastBank, null);
      assert.deepEqual(context.contextData, {});
    });

    it('should return existing context if already present', async () => {
      await service.updateContext('5511999998888', {
        currentState: 'AWAITING_EXPENSE_VALUE',
        lastBank: 'Nubank',
      });

      const context = await service.getOrCreate('5511999998888');
      assert.equal(context.phone, '5511999998888');
      assert.equal(context.currentState, 'AWAITING_EXPENSE_VALUE');
      assert.equal(context.lastBank, 'Nubank');
    });
  });

  describe('update hooks', () => {
    it('should update lastIntent via setLastIntent', async () => {
      const ctx = await service.setLastIntent('5511999998888', 'REGISTRAR_GASTO');
      assert.equal(ctx.lastIntent, 'REGISTRAR_GASTO');
    });

    it('should update lastBank via setLastBank', async () => {
      const ctx = await service.setLastBank('5511999998888', 'Itaú');
      assert.equal(ctx.lastBank, 'Itaú');
    });

    it('should update lastMonth via setLastMonth', async () => {
      const ctx = await service.setLastMonth('5511999998888', '2026-08');
      assert.equal(ctx.lastMonth, '2026-08');
    });

    it('should update currentState and waitingFor via setCurrentState', async () => {
      const ctx = await service.setCurrentState(
        '5511999998888',
        'WAITING_CHOICE',
        'menu_selection',
      );
      assert.equal(ctx.currentState, 'WAITING_CHOICE');
      assert.equal(ctx.waitingFor, 'menu_selection');
    });

    it('should update sessionStatus via setSessionStatus', async () => {
      const ctx = await service.setSessionStatus('5511999998888', 'EXPIRED');
      assert.equal(ctx.sessionStatus, 'EXPIRED');
    });
  });

  describe('mergeContextData', () => {
    it('should deeply merge metadata into contextData', async () => {
      await service.updateContext('5511999998888', {
        contextData: { valor: 45.5, categoria: 'Alimentação' },
      });

      const updated = await service.mergeContextData('5511999998888', {
        estabelecimento: 'Restaurante Sabor',
      });

      assert.equal(updated.contextData.valor, 45.5);
      assert.equal(updated.contextData.categoria, 'Alimentação');
      assert.equal(updated.contextData.estabelecimento, 'Restaurante Sabor');
    });
  });

  describe('resetContext & deleteContext', () => {
    it('should reset conversation state while maintaining phone record', async () => {
      await service.updateContext('5511999998888', {
        currentState: 'AWAITING_INPUT',
        lastIntent: 'CONSULTAR_RELATORIO',
        waitingFor: 'data_inicio',
        contextData: { temp: 123 },
      });

      const reset = await service.resetContext('5511999998888');
      assert.equal(reset.phone, '5511999998888');
      assert.equal(reset.currentState, 'IDLE');
      assert.equal(reset.lastIntent, null);
      assert.equal(reset.waitingFor, null);
      assert.deepEqual(reset.contextData, {});
    });

    it('should delete context permanently', async () => {
      await service.getOrCreate('5511999998888');
      const deleted = await service.deleteContext('5511999998888');
      assert.equal(deleted, true);

      const after = await service.getByPhone('5511999998888');
      assert.equal(after, null);
    });
  });
});
