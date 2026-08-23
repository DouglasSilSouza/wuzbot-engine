import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wuzbot_idempotency' })
@Index('uq_wuzbot_idempotency_message', ['externalMessageId'], { unique: true })
export class IdempotencyEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'external_message_id', type: 'varchar', length: 255 })
  externalMessageId!: string;

  @Column({ name: 'telefone', type: 'varchar', length: 30 })
  phone!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({ name: 'correlation_id', type: 'varchar', length: 100, nullable: true })
  correlationId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity({ name: 'wuzbot_audit' })
export class TechnicalAuditEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ name: 'telefone', type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId!: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 100, nullable: true })
  correlationId!: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
