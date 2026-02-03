import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn
} from "typeorm"
import { Account } from "./account.entity"

@Entity("transactions")
export class Transaction {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string

  @Column({ type: "varchar", length: 255, name: "account_id" })
  accountId: string

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  amount: number | null

  @Column({ type: "date", nullable: true })
  date: Date | null

  @Column({ type: "text", nullable: true })
  name: string | null

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "merchant_name"
  })
  merchantName: string | null

  @Column({ type: "varchar", length: 255, nullable: true })
  category: string | null

  @Column({ type: "boolean", default: false })
  pending: boolean

  @Column({
    type: "varchar",
    length: 10,
    nullable: true,
    name: "iso_currency_code"
  })
  isoCurrencyCode: string | null

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @ManyToOne(() => Account, (account) => account.transactions, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "account_id" })
  account: Account
}
