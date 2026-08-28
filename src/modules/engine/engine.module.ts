import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { TranslationModule } from '../translation/translation.module';
import { TypebotModule } from '../typebot/typebot.module';
import { ConversationEngine } from './conversation-engine.service';
import { CommandsModule } from '../commands/commands.module';
import { ContextModule } from '../context/context.module';

@Module({
  imports: [
    SessionsModule,
    TranslationModule,
    TypebotModule,
    CommandsModule,
    ContextModule,
  ],
  providers: [ConversationEngine],
  exports: [ConversationEngine],
})
export class EngineModule {}
