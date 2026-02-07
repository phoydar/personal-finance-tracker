import { MigrationInterface, QueryRunner } from "typeorm"

export class AddAccountBalanceSnapshots1706900100000
  implements MigrationInterface
{
  name = "AddAccountBalanceSnapshots1706900100000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS account_balance_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_id INTEGER NOT NULL REFERENCES net_worth_history(id) ON DELETE CASCADE,
        account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        balance DECIMAL(14,2),
        account_type VARCHAR(50),
        account_name VARCHAR(255)
      )
    `)

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_snapshot_id ON account_balance_snapshots(snapshot_id)`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_account_balance_snapshots_account_id ON account_balance_snapshots(account_id)`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS account_balance_snapshots`)
  }
}
