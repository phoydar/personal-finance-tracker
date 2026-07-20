import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { ConfigService } from "@nestjs/config"
import { getRequiredConfig, parseAllowedGoogleEmails } from "./auth.config"
import { AuthenticatedUser, AuthTokenPayload } from "./auth.types"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly allowedGoogleEmails: Set<string>

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredConfig(configService, "JWT_SECRET")
    })

    this.allowedGoogleEmails = parseAllowedGoogleEmails(
      getRequiredConfig(configService, "ALLOWED_GOOGLE_EMAILS")
    )
  }

  validate(payload: AuthTokenPayload): AuthenticatedUser {
    const email = payload.email?.trim().toLowerCase()
    if (!payload.sub || !email || !this.allowedGoogleEmails.has(email)) {
      throw new UnauthorizedException()
    }

    return {
      id: payload.sub,
      email,
      name: payload.name || null,
      picture: payload.picture || null
    }
  }
}
