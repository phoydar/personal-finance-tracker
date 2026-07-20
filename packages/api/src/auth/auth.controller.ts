import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  HttpException,
  HttpStatus
} from "@nestjs/common"
import { IsString, IsNotEmpty } from "class-validator"
import { AuthService } from "./auth.service"
import { Public } from "./public.decorator"

class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  credential: string
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("google")
  async googleAuth(@Body() body: GoogleAuthDto) {
    try {
      return await this.authService.authenticateWithGoogle(body.credential)
    } catch (error: any) {
      if (error.status) {
        throw error
      }
      throw new HttpException(
        error.message || "Authentication failed",
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get("me")
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id)
  }
}
