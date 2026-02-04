import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  HttpException,
  HttpStatus
} from "@nestjs/common"
import { IsString, IsNotEmpty } from "class-validator"
import { AccountsService } from "./accounts.service"

class UpdateAccountNameDto {
  @IsString()
  @IsNotEmpty()
  name: string
}

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

  @Patch("accounts/:id")
  async updateAccountName(
    @Param("id") id: string,
    @Body() body: UpdateAccountNameDto
  ) {
    const result = await this.accountsService.updateAccountName(id, body.name)

    if (!result) {
      throw new HttpException("Account not found", HttpStatus.NOT_FOUND)
    }

    return result
  }
}
