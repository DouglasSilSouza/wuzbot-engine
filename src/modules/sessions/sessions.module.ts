import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypebotModule } from '../typebot/typebot.module';
import { PostgresSessionStore } from './postgres-session.store';
import { SessionManager } from './session-manager.service';
import { SESSION_STORE } from './session-store.interface';
import { TechnicalSessionEntity } from './session.entity';
@Module({ imports: [TypeOrmModule.forFeature([TechnicalSessionEntity]), TypebotModule], providers: [SessionManager, PostgresSessionStore, { provide: SESSION_STORE, useExisting: PostgresSessionStore }], exports: [SessionManager] })
export class SessionsModule {}
