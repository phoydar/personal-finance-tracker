import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  UpdateDateColumn
} from "typeorm"
import { Item } from "./item.entity"
import { Transaction } from "./transaction.entity"
import { Liability } from "./liability.entity"

@Entity("accounts")
export class Account {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string

  @Column({ type: "varchar", length: 255, name: "item_id" })
  itemId: string

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "official_name"
  })
  officialName: string | null

  @Column({ type: "varchar", length: 50, nullable: true })
  type: string | null

  @Column({ type: "varchar", length: 50, nullable: true })
  subtype: string | null

  @Column({ type: "varchar", length: 10, nullable: true })
  mask: string | null

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    name: "current_balance"
  })
  currentBalance: number | null

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    name: "available_balance"
  })
  availableBalance: number | null

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    name: "credit_limit"
  })
  creditLimit: number | null

  @Column({
    type: "varchar",
    length: 10,
    nullable: true,
    name: "iso_currency_code"
  })
  isoCurrencyCode: string | null

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date

  @ManyToOne(() => Item, (item) => item.accounts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "item_id" })
  item: Item

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions: Transaction[]

  @OneToOne(() => Liability, (liability) => liability.account)
  liability: Liability
}
