import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'wuzbot_contexts' })
export class WuzbotContextEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'phone', type: 'varchar', length: 30 })
  @Index('idx_wuzbot_contexts_phone', { unique: true })
  phone!: string;

  @Column({ name: 'current_state', type: 'varchar', length: 100, nullable: true })
  currentState!: string | null;

  @Column({ name: 'last_intent', type: 'varchar', length: 100, nullable: true })
  lastIntent!: string | null;

  @Column({ name: 'last_typebot_group', type: 'varchar', length: 100, nullable: true })
  lastTypebotGroup!: string | null;

  @Column({ name: 'waiting_for', type: 'varchar', length: 100, nullable: true })
  waitingFor!: string | null;

  @Column({ name: 'last_bank', type: 'varchar', length: 100, nullable: true })
  lastBank!: string | null;

  @Column({ name: 'last_month', type: 'varchar', length: 30, nullable: true })
  lastMonth!: string | null;

  @Column({ name: 'session_status', type: 'varchar', length: 30, default: 'ACTIVE' })
  sessionStatus!: string;

  @Column({ name: 'context_data', type: 'jsonb', default: {} })
  contextData!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
