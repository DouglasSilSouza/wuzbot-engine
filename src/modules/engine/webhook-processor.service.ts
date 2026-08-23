import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConversationEngine } from './conversation-engine.service';
import { WuzapiAdapter } from '../wuzapi/wuzapi.adapter';
import { IDEMPOTENCY_STORE, IdempotencyStore } from '../common/idempotency-store.interface';
import { PHONE_LOCK, PhoneLock } from '../common/phone-lock.interface';
import { CanonicalOutputType } from '../translation/canonical.types';

@Injectable()
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly wuzapi: WuzapiAdapter,
    private readonly engine: ConversationEngine,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
    @Inject(PHONE_LOCK) private readonly phoneLock: PhoneLock,
  ) {}

  validateSecret(secret?: string): void {
    this.wuzapi.validateWebhookSecret(secret);
  }

  async process(payload: unknown, secret?: string): Promise<void> {
    this.validateSecret(secret);
    const input = this.wuzapi.normalizeWebhook(payload);
    this.logger.log(`Received message ${input.externalMessageId} from phone ${input.phone} (type: ${input.type})`);

    if (await this.idempotency.hasProcessed(input.externalMessageId)) {
      this.logger.warn(`Message ${input.externalMessageId} already processed (idempotency hit). Skipping.`);
      return;
    }

    await this.phoneLock.runExclusive(input.phone, async () => {
      if (await this.idempotency.hasProcessed(input.externalMessageId)) {
        this.logger.warn(`Message ${input.externalMessageId} already processed inside lock. Skipping.`);
        return;
      }

      const outputs = await this.engine.handle(input);
      this.logger.log(`Engine returned ${outputs.length} outputs for phone ${input.phone}`);

      if (outputs.length === 0) {
        this.logger.warn(`No outputs from engine for phone ${input.phone}. Injecting fallback processing message.`);
        outputs.push({
          type: CanonicalOutputType.TEXT,
          text: 'Processando...'
        });
      }

      for (const output of outputs) {
        await this.wuzapi.send(input.phone, output);
      }

      await this.idempotency.markProcessed(input.externalMessageId, input.phone, input.externalMessageId);
      this.logger.log(`Successfully processed and recorded message ${input.externalMessageId}`);
    });
  }
}


