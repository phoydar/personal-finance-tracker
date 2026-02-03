import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { PlaidService } from "./plaid.service"
import { PlaidController } from "./plaid.controller"
import { Item, Account, Transaction, Liability } from "../database/entities"

@Module({
  imports: [TypeOrmModule.forFeature([Item, Account, Transaction, Liability])],
  controllers: [PlaidController],
  providers: [PlaidService],
  exports: [PlaidService]
})
export class PlaidModule {}
