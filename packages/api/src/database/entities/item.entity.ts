import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn
} from "typeorm"
import { Account } from "./account.entity"
import { User } from "./user.entity"

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

  @Column({ type: "uuid", nullable: true, name: "user_id" })
  userId: string | null

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @ManyToOne(() => User, (user) => user.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User

  @OneToMany(() => Account, (account) => account.item)
  accounts: Account[]
}
