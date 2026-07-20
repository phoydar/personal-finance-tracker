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
import {
  IsString,
  IsOptional,
  ValidateNested,
  IsNotEmpty
} from "class-validator"
import { Type } from "class-transformer"
import { PlaidService } from "./plaid.service"

class InstitutionDto {
  @IsOptional()
  @IsString()
  institution_id?: string

  @IsOptional()
  @IsString()
  name?: string
}

class ExchangeTokenDto {
  @IsString()
  @IsNotEmpty()
  public_token: string

  @IsOptional()
  @ValidateNested()
  @Type(() => InstitutionDto)
  institution?: InstitutionDto
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
    console.log(
      "exchange_public_token received raw body:",
      JSON.stringify(body)
    )
    console.log(
      "exchange_public_token body.public_token:",
      body.public_token
        ? `present (${body.public_token.substring(0, 10)}...)`
        : "MISSING"
    )

    if (!body || !body.public_token) {
      console.error("Validation failed - body:", body)
      throw new HttpException(
        "public_token is required",
        HttpStatus.BAD_REQUEST
      )
    }

    try {
      const result = await this.plaidService.exchangePublicToken(
        body.public_token,
        body.institution
      )
      return { success: true, ...result }
    } catch (error: any) {
      console.error(
        "exchange_public_token error:",
        error.response?.data || error.message
      )
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
