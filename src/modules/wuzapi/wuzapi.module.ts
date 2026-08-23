import { Module } from '@nestjs/common';
import { EngineModule } from '../engine/engine.module';
import { CommonModule } from '../common/common.module';
import { WebhookProcessor } from '../engine/webhook-processor.service';
import { WuzapiAdapter } from './wuzapi.adapter';
import { WuzapiWebhookController } from './wuzapi.webhook.controller';
@Module({ imports: [EngineModule, CommonModule], providers: [WuzapiAdapter, WebhookProcessor], controllers: [WuzapiWebhookController], exports: [WuzapiAdapter] })
export class WuzapiModule {}
