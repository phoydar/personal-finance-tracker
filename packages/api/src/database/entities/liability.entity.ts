import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn
} from "typeorm"
import { Account } from "./account.entity"

@Entity("liabilities")
export class Liability {
  @PrimaryColumn({ type: "varchar", length: 255, name: "account_id" })
  accountId: string

  @Column({ type: "varchar", length: 50, nullable: true })
  type: string | null

  @Column({ type: "decimal", precision: 6, scale: 4, nullable: true })
  apr: number | null

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    name: "minimum_payment"
  })
  minimumPayment: number | null

  @Column({ type: "date", nullable: true, name: "next_payment_due_date" })
  nextPaymentDueDate: Date | null

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    name: "last_statement_balance"
  })
  lastStatementBalance: number | null

  @Column({ type: "date", nullable: true, name: "last_statement_date" })
  lastStatementDate: Date | null

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date

  @OneToOne(() => Account, (account) => account.liability, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "account_id" })
  account: Account
}
