import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicalSessionEntity } from './session.entity';
import { SessionStore } from './session-store.interface';
@Injectable()
export class PostgresSessionStore implements SessionStore {
  constructor(@InjectRepository(TechnicalSessionEntity) private readonly repository: Repository<TechnicalSessionEntity>) {}
  findByPhone(phone: string) { return this.repository.findOne({ where: { phone } }); }
  save(session: Partial<TechnicalSessionEntity>) { return this.repository.save(session); }
  async touch(phone: string): Promise<void> { await this.repository.update({ phone }, { lastInteractionAt: new Date() }); }
}
