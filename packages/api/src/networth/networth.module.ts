import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { NetworthService } from "./networth.service"
import { NetworthController } from "./networth.controller"
import { TrendsController } from "./trends.controller"
import {
  Account,
  NetWorthSnapshot,
  AccountBalanceSnapshot
} from "../database/entities"

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      NetWorthSnapshot,
      AccountBalanceSnapshot
    ])
  ],
  controllers: [NetworthController, TrendsController],
  providers: [NetworthService],
  exports: [NetworthService]
})
export class NetworthModule {}
