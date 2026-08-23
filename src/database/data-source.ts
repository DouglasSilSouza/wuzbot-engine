import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { TechnicalSessionEntity } from '../modules/sessions/session.entity';
import { IdempotencyEntity, TechnicalAuditEntity } from '../modules/sessions/technical.entities';
import { TechnicalMetricEntity } from '../modules/sessions/metrics.entity';
import { WuzbotContextEntity } from '../modules/context/context.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    TechnicalSessionEntity,
    IdempotencyEntity,
    TechnicalAuditEntity,
    TechnicalMetricEntity,
    WuzbotContextEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});

export default dataSource;
