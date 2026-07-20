import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from "typeorm"
import { Item } from "./item.entity"

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255, unique: true, name: "google_id" })
  googleId: string

  @Column({ type: "varchar", length: 255 })
  email: string

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null

  @Column({ type: "text", nullable: true })
  picture: string | null

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date

  @OneToMany(() => Item, (item) => item.user)
  items: Item[]
}
