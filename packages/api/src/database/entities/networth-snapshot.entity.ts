import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn
} from "typeorm"

@Entity("net_worth_history")
export class NetWorthSnapshot {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    type: "decimal",
    precision: 14,
    scale: 2,
    nullable: true,
    name: "total_assets"
  })
  totalAssets: number | null

  @Column({
    type: "decimal",
    precision: 14,
    scale: 2,
    nullable: true,
    name: "total_liabilities"
  })
  totalLiabilities: number | null

  @Column({
    type: "decimal",
    precision: 14,
    scale: 2,
    nullable: true,
    name: "net_worth"
  })
  netWorth: number | null

  @Column({
    type: "date",
    default: () => "CURRENT_DATE",
    name: "snapshot_date"
  })
  snapshotDate: Date

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date
}
