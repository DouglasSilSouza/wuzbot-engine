import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WebhookProcessor } from '../engine/webhook-processor.service';
@Controller('webhooks/wuzapi')
export class WuzapiWebhookController {
  constructor(private readonly processor: WebhookProcessor) {}
  @Post()
  receive(@Body() payload: unknown, @Headers('x-webhook-secret') secret?: string): Promise<void> { this.processor.validateSecret(secret); return this.processor.process(payload, secret); }
}
