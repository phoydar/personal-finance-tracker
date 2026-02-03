import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus
} from "@nestjs/common"
import { PlaidService } from "./plaid.service"

class ExchangeTokenDto {
  public_token: string
  institution?: {
    institution_id?: string
    name?: string
  }
}

@Controller()
export class PlaidController {
  constructor(private readonly plaidService: PlaidService) {}

  @Get("create_link_token")
  async createLinkToken() {
    try {
      return await this.plaidService.createLinkToken()
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.error_message || "Failed to create link token",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post("exchange_public_token")
  async exchangePublicToken(@Body() body: ExchangeTokenDto) {
    try {
      const result = await this.plaidService.exchangePublicToken(
        body.public_token,
        body.institution
      )
      return { success: true, ...result }
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.error_message || "Failed to exchange token",
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post("sync")
  async syncTransactions() {
    try {
      const result = await this.plaidService.syncTransactions()
      return { success: true, ...result }
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to sync transactions",
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post("refresh_balances")
  async refreshBalances() {
    try {
      await this.plaidService.refreshBalances()
      return { success: true }
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to refresh balances",
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post("sync_liabilities")
  async syncLiabilities() {
    try {
      await this.plaidService.syncLiabilities()
      return { success: true }
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to sync liabilities",
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Delete("items/:id")
  async removeItem(@Param("id") id: string) {
    try {
      await this.plaidService.removeItem(id)
      return { success: true }
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to remove item",
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }
}
