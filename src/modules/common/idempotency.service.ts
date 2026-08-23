import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyEntity } from '../sessions/technical.entities';
import { IdempotencyStore } from './idempotency-store.interface';

@Injectable()
export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(@InjectRepository(IdempotencyEntity) private readonly repository: Repository<IdempotencyEntity>) {}

  async hasProcessed(externalMessageId: string): Promise<boolean> {
    return Boolean(await this.repository.findOne({ where: { externalMessageId } }));
  }

  async markProcessed(externalMessageId: string, phone: string, correlationId: string): Promise<void> {
    await this.repository.upsert({ externalMessageId, phone, correlationId, status: 'PROCESSED' }, ['externalMessageId']);
  }
}
