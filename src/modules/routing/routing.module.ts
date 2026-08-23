import { Module } from '@nestjs/common';
import { TypebotIntentMapper } from './typebot-intent.mapper';
import { IntentRoutingService } from './intent-routing.service';
import { WuzMindModule } from '../wuzmind/wuzmind.module';

@Module({
  imports: [WuzMindModule],
  providers: [TypebotIntentMapper, IntentRoutingService],
  exports: [TypebotIntentMapper, IntentRoutingService],
})
export class RoutingModule {}
