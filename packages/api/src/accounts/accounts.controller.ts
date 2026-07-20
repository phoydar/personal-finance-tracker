import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Request,
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
  async findAllItems(@Request() req: any) {
    return this.accountsService.findAllItems(req.user.id)
  }

  @Get("accounts")
  async findAllAccounts(@Request() req: any) {
    return this.accountsService.findAllAccounts(req.user.id)
  }

  @Get("liabilities")
  async findAllLiabilities(@Request() req: any) {
    return this.accountsService.findAllLiabilities(req.user.id)
  }

  @Patch("accounts/:id")
  async updateAccountName(
    @Param("id") id: string,
    @Body() body: UpdateAccountNameDto,
    @Request() req: any
  ) {
    const result = await this.accountsService.updateAccountName(id, body.name, req.user.id)

    if (!result) {
      throw new HttpException("Account not found", HttpStatus.NOT_FOUND)
    }

    return result
  }
}
