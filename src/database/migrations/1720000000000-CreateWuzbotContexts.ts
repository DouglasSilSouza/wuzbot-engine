import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWuzbotContexts1720000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wuzbot_contexts (
        id bigserial PRIMARY KEY,
        phone varchar(30) NOT NULL UNIQUE,
        current_state varchar(100),
        last_intent varchar(100),
        last_typebot_group varchar(100),
        waiting_for varchar(100),
        last_bank varchar(100),
        last_month varchar(30),
        session_status varchar(30) NOT NULL DEFAULT 'ACTIVE',
        context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_wuzbot_contexts_phone ON wuzbot_contexts (phone)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_wuzbot_contexts_session_status ON wuzbot_contexts (session_status)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_wuzbot_contexts_updated_at ON wuzbot_contexts (updated_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_wuzbot_contexts_updated_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_wuzbot_contexts_session_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_wuzbot_contexts_phone');
    await queryRunner.query('DROP TABLE IF EXISTS wuzbot_contexts');
  }
}
