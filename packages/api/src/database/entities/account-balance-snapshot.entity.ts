import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn
} from "typeorm"
import { NetWorthSnapshot } from "./networth-snapshot.entity"
import { Account } from "./account.entity"

@Entity("account_balance_snapshots")
export class AccountBalanceSnapshot {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: "snapshot_id" })
  snapshotId: number

  @Column({ type: "varchar", length: 255, name: "account_id" })
  accountId: string

  @Column({
    type: "decimal",
    precision: 14,
    scale: 2,
    nullable: true
  })
  balance: number | null

  @Column({ type: "varchar", length: 50, nullable: true, name: "account_type" })
  accountType: string | null

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "account_name"
  })
  accountName: string | null

  @ManyToOne(() => NetWorthSnapshot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "snapshot_id" })
  snapshot: NetWorthSnapshot

  @ManyToOne(() => Account, { onDelete: "CASCADE" })
  @JoinColumn({ name: "account_id" })
  account: Account
}
