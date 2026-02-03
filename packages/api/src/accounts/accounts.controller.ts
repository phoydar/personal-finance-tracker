import { Controller, Get } from "@nestjs/common"
import { AccountsService } from "./accounts.service"

@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get("items")
  async findAllItems() {
    return this.accountsService.findAllItems()
  }

  @Get("accounts")
  async findAllAccounts() {
    return this.accountsService.findAllAccounts()
  }

  @Get("liabilities")
  async findAllLiabilities() {
    return this.accountsService.findAllLiabilities()
  }
}
