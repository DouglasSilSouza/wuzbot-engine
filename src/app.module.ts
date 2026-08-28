import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngineModule } from './modules/engine/engine.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ContextModule } from './modules/context/context.module';
import { TranslationModule } from './modules/translation/translation.module';
import { TypebotModule } from './modules/typebot/typebot.module';
import { WuzapiModule } from './modules/wuzapi/wuzapi.module';
import { CommandsModule } from './modules/commands/commands.module';
import { HealthController } from './modules/common/health/health.controller';
import { TechnicalSessionEntity } from './modules/sessions/session.entity';
import { IdempotencyEntity, TechnicalAuditEntity } from './modules/sessions/technical.entities';
import { CommonModule } from './modules/common/common.module';
import { TechnicalMetricEntity } from './modules/sessions/metrics.entity';
import { WuzbotContextEntity } from './modules/context/context.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        TechnicalSessionEntity,
        IdempotencyEntity,
        TechnicalAuditEntity,
        TechnicalMetricEntity,
        WuzbotContextEntity,
      ],
      migrations: ['dist/database/migrations/*.js'],
      synchronize: false,
    }),
    CommonModule,
    CommandsModule,
    ContextModule,
    SessionsModule,
    TranslationModule,
    TypebotModule,
    EngineModule,
    WuzapiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
