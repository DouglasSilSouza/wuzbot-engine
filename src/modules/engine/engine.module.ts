import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { TranslationModule } from '../translation/translation.module';
import { TypebotModule } from '../typebot/typebot.module';
import { ConversationEngine } from './conversation-engine.service';
import { CommandsModule } from '../commands/commands.module';
import { HumanBehaviorModule } from '../human-behavior/human-behavior.module';
import { RoutingModule } from '../routing/routing.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { MediaRoutingModule } from '../media-routing/media-routing.module';
import { ContextModule } from '../context/context.module';
import { WuzMindModule } from '../wuzmind/wuzmind.module';
import { UserAccessModule } from '../user-access/user-access.module';

@Module({
  imports: [
    SessionsModule,
    TranslationModule,
    TypebotModule,
    CommandsModule,
    HumanBehaviorModule,
    RoutingModule,
    RecoveryModule,
    MediaRoutingModule,
    ContextModule,
    WuzMindModule,
    UserAccessModule,
  ],
  providers: [ConversationEngine],
  exports: [ConversationEngine],
})
export class EngineModule {}
