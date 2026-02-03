import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { NetworthService } from "./networth.service"
import { NetworthController } from "./networth.controller"
import { Account, NetWorthSnapshot } from "../database/entities"

@Module({
  imports: [TypeOrmModule.forFeature([Account, NetWorthSnapshot])],
  controllers: [NetworthController],
  providers: [NetworthService],
  exports: [NetworthService]
})
export class NetworthModule {}
