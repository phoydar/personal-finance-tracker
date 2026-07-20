import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany
} from "typeorm"
import { Account } from "./account.entity"

@Entity("items")
export class Item {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string

  @Column({ type: "text", name: "access_token" })
  accessToken: string

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "institution_id"
  })
  institutionId: string | null

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "institution_name"
  })
  institutionName: string | null

  @Column({ type: "text", nullable: true })
  cursor: string | null

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @OneToMany(() => Account, (account) => account.item)
  accounts: Account[]
}
