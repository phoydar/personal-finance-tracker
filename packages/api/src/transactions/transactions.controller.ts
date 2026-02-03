import { Controller, Get, Query } from "@nestjs/common"
import { TransactionsService, TransactionFilters } from "./transactions.service"

@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get("transactions")
  async findAll(@Query() filters: TransactionFilters) {
    return this.transactionsService.findAll({
      ...filters,
      limit: filters.limit ? Number(filters.limit) : 100,
      offset: filters.offset ? Number(filters.offset) : 0
    })
  }

  @Get("spending_by_category")
  async getSpendingByCategory(
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string
  ) {
    return this.transactionsService.getSpendingByCategory({
      start_date,
      end_date
    })
  }

  @Get("income")
  async getIncome(
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string
  ) {
    return this.transactionsService.getIncome({ start_date, end_date })
  }
}
