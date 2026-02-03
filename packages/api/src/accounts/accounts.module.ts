import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AccountsService } from "./accounts.service"
import { AccountsController } from "./accounts.controller"
import { Item, Account, Liability } from "../database/entities"

@Module({
  imports: [TypeOrmModule.forFeature([Item, Account, Liability])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService]
})
export class AccountsModule {}
