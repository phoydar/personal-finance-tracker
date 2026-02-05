import { Controller, Get, Query } from "@nestjs/common"
import { NetworthService } from "./networth.service"

@Controller("trends")
export class TrendsController {
  constructor(private readonly networthService: NetworthService) {}

  @Get("composition")
  async getCompositionTrends(
    @Query("days") days?: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string
  ) {
    return this.networthService.getCompositionTrends({
      days: days ? parseInt(days) : undefined,
      startDate,
      endDate
    })
  }

  @Get("accounts")
  async getAccountTrends(
    @Query("account_id") accountId?: string,
    @Query("days") days?: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string
  ) {
    return this.networthService.getAccountTrends({
      accountId,
      days: days ? parseInt(days) : undefined,
      startDate,
      endDate
    })
  }
}
