import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WuzMindRestClient } from '../../dist/modules/wuzmind/wuzmind.client.js';
import { WuzMindConfig } from '../../dist/modules/wuzmind/wuzmind.config.js';
import { IntentEnum } from '../../dist/modules/wuzmind/enums/intent.enum.js';
import { SuggestedActionEnum } from '../../dist/modules/wuzmind/enums/suggested-action.enum.js';

describe('WuzMindRestClient', () => {
  let client;
  let originalFetch;
  let fetchCalls;

  const createConfig = (overrides = {}) => {
    const mockConfigService = {
      get: (key, defaultValue) => {
        const values = {
          WUZMIND_ENABLED: 'true',
          WUZMIND_URL: 'http://wuzmind-service:3000',
          WUZMIND_API_KEY: 'test-wuzmind-secret-key',
          WUZMIND_TIMEOUT_MS: '5000',
          WUZMIND_MIN_CONFIDENCE: '0.65',
          ...overrides,
        };
        return values[key] ?? defaultValue;
      },
    };
    return new WuzMindConfig(mockConfigService);
  };

  beforeEach(() => {
    fetchCalls = [];
    originalFetch = global.fetch;
    client = new WuzMindRestClient(createConfig());
  });

  describe('Authentication & Headers', () => {
    it('should include x-wuzmind-api-key header in requests', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            intent: IntentEnum.REGISTRAR_GASTO,
            confidence: 0.95,
            entities: { value: 50 },
            suggestedAction: SuggestedActionEnum.START_TYPEBOT_FLOW,
            provider: 'OLLAMA',
          }),
        };
      };

      const res = await client.classifyIntent({
        phone: '5511999998888',
        message: 'gastei 50 no mercado',
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'http://wuzmind-service:3000/v1/intent/classify');
      assert.equal(
        fetchCalls[0].options.headers['x-wuzmind-api-key'],
        'test-wuzmind-secret-key',
      );
      assert.equal(
        fetchCalls[0].options.headers['x-api-key'],
        'test-wuzmind-secret-key',
      );
      assert.equal(
        fetchCalls[0].options.headers['Authorization'],
        'Bearer test-wuzmind-secret-key',
      );
      assert.equal(fetchCalls[0].options.headers['Content-Type'], 'application/json');
      assert.equal(res.intent, IntentEnum.REGISTRAR_GASTO);
      assert.equal(res.confidence, 0.95);
    });
  });

  describe('Resilience & Fallback', () => {
    it('should return STATIC_FALLBACK gracefully when WuzMind is down or returns 500', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        };
      };

      const res = await client.classifyIntent({
        phone: '5511999998888',
        message: 'gastei 50',
      });

      assert.equal(res.intent, IntentEnum.DESCONHECIDA);
      assert.equal(res.confidence, 0);
      assert.equal(res.suggestedAction, SuggestedActionEnum.STATIC_FALLBACK);
    });

    it('should return STATIC_FALLBACK gracefully on network timeout', async () => {
      global.fetch = async () => {
        const error = new Error('The operation was aborted');
        error.name = 'TimeoutError';
        throw error;
      };

      const res = await client.classifyIntent({
        phone: '5511999998888',
        message: 'quanto gastei esse mês?',
      });

      assert.equal(res.intent, IntentEnum.DESCONHECIDA);
      assert.equal(res.suggestedAction, SuggestedActionEnum.STATIC_FALLBACK);
    });

    it('should open circuit only after 3 consecutive failures', async () => {
      let callCount = 0;
      global.fetch = async () => {
        callCount++;
        return { ok: false, status: 500, text: async () => '500' };
      };

      // 1st failure
      await client.classifyIntent({ phone: '5511999998888', message: 'm1' });
      assert.equal(callCount, 1);

      // 2nd failure
      await client.classifyIntent({ phone: '5511999998888', message: 'm2' });
      assert.equal(callCount, 2);

      // 3rd failure (trips circuit)
      await client.classifyIntent({ phone: '5511999998888', message: 'm3' });
      assert.equal(callCount, 3);

      // 4th call is blocked by open circuit without calling fetch
      const res = await client.classifyIntent({ phone: '5511999998888', message: 'm4' });
      assert.equal(callCount, 3);
      assert.equal(res.intent, IntentEnum.DESCONHECIDA);
    });

    it('should skip calling remote WuzMind when WUZMIND_ENABLED is false', async () => {
      const disabledClient = new WuzMindRestClient(createConfig({ WUZMIND_ENABLED: 'false' }));

      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return { ok: true, json: async () => ({}) };
      };

      const res = await disabledClient.classifyIntent({
        phone: '5511999998888',
        message: 'menu',
      });

      assert.equal(fetchCalls.length, 0);
      assert.equal(res.intent, IntentEnum.DESCONHECIDA);
    });
  });

  describe('Health Check', () => {
    it('should report status ok from GET /health', async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', providers: { ollama: { status: 'up' } } }),
      });

      const res = await client.health();
      assert.equal(res.status, 'ok');
    });
  });
});
