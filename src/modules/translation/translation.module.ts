import { Module } from '@nestjs/common';
import { MessageTranslator } from './message-translator.service';
@Module({ providers: [MessageTranslator], exports: [MessageTranslator] })
export class TranslationModule {}
