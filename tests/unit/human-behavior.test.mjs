import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HumanBehaviorService } from '../../dist/modules/human-behavior/human-behavior.service.js';
import { HumanBehaviorCategoryEnum } from '../../dist/modules/wuzmind/enums/human-behavior-category.enum.js';

describe('HumanBehaviorService', () => {
  let mockWuzmind;
  let service;

  beforeEach(() => {
    mockWuzmind = {
      detectHumanBehavior: async () => ({
        isHumanBehavior: false,
        category: null,
      }),
    };
    service = new HumanBehaviorService(mockWuzmind);
  });

  describe('Local Greetings & Chat', () => {
    it('should resolve greetings locally without calling AI', async () => {
      const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'opa', 'beleza'];
      for (const greeting of greetings) {
        const res = await service.detect(greeting);
        assert.equal(res.isHumanBehavior, true, `Failed for: ${greeting}`);
        assert.equal(res.category, HumanBehaviorCategoryEnum.GREETING);
        assert.match(res.replyMessage, /Ol[aá]/i);
      }
    });

    it('should resolve thanks locally without calling AI', async () => {
      const thanksList = ['obrigado', 'obrigada', 'valeu', 'vlw', 'agradeço'];
      for (const t of thanksList) {
        const res = await service.detect(t);
        assert.equal(res.isHumanBehavior, true, `Failed for: ${t}`);
        assert.equal(res.category, HumanBehaviorCategoryEnum.THANKS);
      }
    });

    it('should resolve laughter locally without calling AI', async () => {
      const laughs = ['kkk', 'kkkkk', 'hahaha', 'rsrs'];
      for (const l of laughs) {
        const res = await service.detect(l);
        assert.equal(res.isHumanBehavior, true, `Failed for: ${l}`);
        assert.equal(res.category, HumanBehaviorCategoryEnum.LAUGHTER);
      }
    });
  });

  describe('AI Fallback', () => {
    it('should call WuzMind when local rules do not match', async () => {
      mockWuzmind.detectHumanBehavior = async () => ({
        isHumanBehavior: true,
        category: HumanBehaviorCategoryEnum.CHAT,
        suggestedMessage: 'Olá! Como posso ajudar?',
      });

      const res = await service.detect('como você está hoje?');
      assert.equal(res.isHumanBehavior, true);
      assert.equal(res.category, HumanBehaviorCategoryEnum.CHAT);
    });
  });
});
