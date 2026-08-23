import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wuzbot_metrics' })
export class TechnicalMetricEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'metric_name', type: 'varchar', length: 100 })
  metricName!: string;

  @Column({ name: 'provider', type: 'varchar', length: 50, nullable: true })
  provider!: string | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs!: number | null;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
