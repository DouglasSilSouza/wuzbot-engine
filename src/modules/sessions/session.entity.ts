import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity({ name: 'wuzbot_session_links' })
export class TechnicalSessionEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'telefone', type: 'varchar', length: 30 }) @Index('idx_usuario_atendimento_telefone', { unique: true }) phone!: string;
  @Column({ name: 'typebot_session_id', type: 'varchar', length: 255, nullable: true }) typebotSessionId!: string | null;
  @Column({ name: 'typebot_user_id', type: 'varchar', length: 255, nullable: true }) typebotUserId!: string | null;
  @Column({ name: 'session_status', type: 'varchar', length: 30, default: 'ACTIVE' }) status!: string;
  @Column({ name: 'last_interaction_at', type: 'timestamptz', nullable: true }) lastInteractionAt!: Date | null;
  @Column({ name: 'metadata_json', type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
