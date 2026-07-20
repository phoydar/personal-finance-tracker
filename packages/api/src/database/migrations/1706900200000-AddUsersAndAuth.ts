import { MigrationInterface, QueryRunner } from "typeorm"

export class AddUsersAndAuth1706900200000 implements MigrationInterface {
  name = "AddUsersAndAuth1706900200000"

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add user_id column to items table (nullable to support existing data)
    await queryRunner.query(`
      ALTER TABLE items
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE
    `)

    // Index for faster lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_google_id`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_items_user_id`)
    await queryRunner.query(`ALTER TABLE items DROP COLUMN IF EXISTS user_id`)
    await queryRunner.query(`DROP TABLE IF EXISTS users`)
  }
}
