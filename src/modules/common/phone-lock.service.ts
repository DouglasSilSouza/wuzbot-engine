import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PhoneLock } from './phone-lock.interface';

@Injectable()
export class PostgresPhoneLock implements PhoneLock {
  constructor(private readonly dataSource: DataSource) {}

  async runExclusive<T>(phone: string, operation: () => Promise<T>): Promise<T> {
    const connection = this.dataSource.createQueryRunner();
    await connection.connect();
    const lockKey = this.hashPhone(phone);
    try {
      await connection.query('SELECT pg_advisory_lock($1)', [lockKey]);
      return await operation();
    } finally {
      await connection.query('SELECT pg_advisory_unlock($1)', [lockKey]);
      await connection.release();
    }
  }

  private hashPhone(phone: string): number {
    let hash = 0;
    for (const character of phone) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    return hash;
  }
}
