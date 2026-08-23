import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddTechnicalSessionColumns1710000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS wuzbot_session_links (id bigserial PRIMARY KEY, telefone varchar(30) NOT NULL UNIQUE, typebot_session_id varchar(255), typebot_user_id varchar(255), session_status varchar(30) NOT NULL DEFAULT 'ACTIVE', last_interaction_at timestamptz, metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_wuzbot_session_links_typebot_session_id ON wuzbot_session_links (typebot_session_id)');
    await queryRunner.query('CREATE TABLE IF NOT EXISTS wuzbot_idempotency (id bigserial PRIMARY KEY, external_message_id varchar(255) NOT NULL UNIQUE, telefone varchar(30) NOT NULL, status varchar(30) NOT NULL, correlation_id varchar(100), created_at timestamptz NOT NULL DEFAULT now())');
    await queryRunner.query('CREATE TABLE IF NOT EXISTS wuzbot_audit (id bigserial PRIMARY KEY, event_type varchar(100) NOT NULL, telefone varchar(30), external_id varchar(255), correlation_id varchar(100), metadata jsonb NOT NULL DEFAULT \'{}\'::jsonb, created_at timestamptz NOT NULL DEFAULT now())');
    await queryRunner.query('CREATE TABLE IF NOT EXISTS wuzbot_metrics (id bigserial PRIMARY KEY, metric_name varchar(100) NOT NULL, provider varchar(50), duration_ms integer, status varchar(30) NOT NULL, metadata jsonb NOT NULL DEFAULT \'{}\'::jsonb, created_at timestamptz NOT NULL DEFAULT now())');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS wuzbot_metrics'); await queryRunner.query('DROP TABLE IF EXISTS wuzbot_audit'); await queryRunner.query('DROP TABLE IF EXISTS wuzbot_idempotency'); await queryRunner.query('DROP INDEX IF EXISTS idx_wuzbot_session_links_typebot_session_id'); await queryRunner.query('DROP TABLE IF EXISTS wuzbot_session_links'); }
}
