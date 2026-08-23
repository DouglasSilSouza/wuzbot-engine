import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WuzMindMediaRoutingService } from '../../dist/modules/media-routing/wuzmind-media-routing.service.js';
import { CanonicalInputType, CanonicalOutputType } from '../../dist/modules/translation/canonical.types.js';
import { MediaClassificationEnum } from '../../dist/modules/wuzmind/enums/media-classification.enum.js';
import { SuggestedActionEnum } from '../../dist/modules/wuzmind/enums/suggested-action.enum.js';

describe('WuzMindMediaRoutingService', () => {
  let mockWuzmind;
  let service;

  beforeEach(() => {
    mockWuzmind = {
      classifyMedia: async () => ({
        classification: MediaClassificationEnum.COMPROVANTE,
        confidence: 0.94,
        suggestedAction: SuggestedActionEnum.SEND_TO_N8N_OCR,
        provider: 'OLLAMA',
      }),
    };
    service = new WuzMindMediaRoutingService(mockWuzmind);
  });

  it('should classify receipt image and suggest registering expense', async () => {
    const input = {
      phone: '5511999998888',
      externalMessageId: 'msg-media-1',
      type: CanonicalInputType.IMAGE,
      media: {
        url: 'https://example.com/receipt.jpg',
        mimeType: 'image/jpeg',
        fileName: 'receipt.jpg',
      },
    };

    const res = await service.classifyAndRoute(input);
    assert.equal(res.decision.classification, MediaClassificationEnum.COMPROVANTE);
    assert.equal(res.decision.suggestedAction, SuggestedActionEnum.SEND_TO_N8N_OCR);
    assert.equal(res.userOutputs.length, 1);
    assert.equal(res.userOutputs[0].type, CanonicalOutputType.BUTTONS);
    assert.match(res.userOutputs[0].text, /Comprovante identificado/i);
  });

  it('should acknowledge audio note', async () => {
    mockWuzmind.classifyMedia = async () => ({
      classification: MediaClassificationEnum.AUDIO_DESPESA,
      confidence: 0.88,
      suggestedAction: SuggestedActionEnum.SEND_TO_N8N_TRANSCRIPTION,
      provider: 'OLLAMA',
    });

    const input = {
      phone: '5511999998888',
      externalMessageId: 'msg-audio-1',
      type: CanonicalInputType.AUDIO,
      media: {
        url: 'https://example.com/audio.ogg',
        mimeType: 'audio/ogg',
      },
    };

    const res = await service.classifyAndRoute(input);
    assert.equal(res.decision.classification, MediaClassificationEnum.AUDIO_DESPESA);
    assert.equal(res.userOutputs.length, 1);
    assert.match(res.userOutputs[0].text, /Áudio recebido/i);
  });
});
