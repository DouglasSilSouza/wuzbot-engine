import { Module } from '@nestjs/common';
import { CONVERSATION_PROVIDER } from './conversation-provider.interface';
import { TypebotProvider } from './typebot.provider';
@Module({ providers: [TypebotProvider, { provide: CONVERSATION_PROVIDER, useExisting: TypebotProvider }], exports: [CONVERSATION_PROVIDER, TypebotProvider] })
export class TypebotModule {}
