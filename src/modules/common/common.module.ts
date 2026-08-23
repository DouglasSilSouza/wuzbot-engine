import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyEntity } from '../sessions/technical.entities';
import { IDEMPOTENCY_STORE } from './idempotency-store.interface';
import { PostgresIdempotencyStore } from './idempotency.service';
import { PHONE_LOCK } from './phone-lock.interface';
import { PostgresPhoneLock } from './phone-lock.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyEntity])],
  providers: [PostgresIdempotencyStore, PostgresPhoneLock, { provide: IDEMPOTENCY_STORE, useExisting: PostgresIdempotencyStore }, { provide: PHONE_LOCK, useExisting: PostgresPhoneLock }],
  exports: [IDEMPOTENCY_STORE, PHONE_LOCK],
})
export class CommonModule {}
