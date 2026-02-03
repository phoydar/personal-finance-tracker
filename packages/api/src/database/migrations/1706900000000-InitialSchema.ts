import { MigrationInterface, QueryRunner } from "typeorm"

export class InitialSchema1706900000000 implements MigrationInterface {
  name = "InitialSchema1706900000000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(255) PRIMARY KEY,
        access_token TEXT NOT NULL,
        institution_id VARCHAR(255),
        institution_name VARCHAR(255),
        cursor TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Accounts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(255) PRIMARY KEY,
        item_id VARCHAR(255) REFERENCES items(id) ON DELETE CASCADE,
        name VARCHAR(255),
        official_name VARCHAR(255),
        type VARCHAR(50),
        subtype VARCHAR(50),
        mask VARCHAR(10),
        current_balance DECIMAL(12,2),
        available_balance DECIMAL(12,2),
        credit_limit DECIMAL(12,2),
        iso_currency_code VARCHAR(10),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        account_id VARCHAR(255) REFERENCES accounts(id) ON DELETE CASCADE,
        amount DECIMAL(12,2),
        date DATE,
        name TEXT,
        merchant_name VARCHAR(255),
        category VARCHAR(255),
        pending BOOLEAN DEFAULT FALSE,
        iso_currency_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Liabilities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS liabilities (
        account_id VARCHAR(255) PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        type VARCHAR(50),
        apr DECIMAL(6,4),
        minimum_payment DECIMAL(12,2),
        next_payment_due_date DATE,
        last_statement_balance DECIMAL(12,2),
        last_statement_date DATE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Net worth history table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS net_worth_history (
        id SERIAL PRIMARY KEY,
        total_assets DECIMAL(14,2),
        total_liabilities DECIMAL(14,2),
        net_worth DECIMAL(14,2),
        snapshot_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_accounts_item_id ON accounts(item_id)`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_net_worth_history_date ON net_worth_history(snapshot_date)`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS liabilities`)
    await queryRunner.query(`DROP TABLE IF EXISTS transactions`)
    await queryRunner.query(`DROP TABLE IF EXISTS accounts`)
    await queryRunner.query(`DROP TABLE IF EXISTS items`)
    await queryRunner.query(`DROP TABLE IF EXISTS net_worth_history`)
  }
}
