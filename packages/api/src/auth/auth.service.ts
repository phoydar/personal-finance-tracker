import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import { OAuth2Client, TokenPayload } from "google-auth-library"
import { getRequiredConfig, parseAllowedGoogleEmails } from "./auth.config"
import { AuthenticatedUser } from "./auth.types"

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly googleClient: OAuth2Client
  private readonly googleClientId: string
  private readonly allowedGoogleEmails: Set<string>

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {
    this.googleClientId = getRequiredConfig(
      this.configService,
      "GOOGLE_CLIENT_ID"
    )
    this.allowedGoogleEmails = parseAllowedGoogleEmails(
      getRequiredConfig(this.configService, "ALLOWED_GOOGLE_EMAILS")
    )
    this.googleClient = new OAuth2Client(this.googleClientId)
  }

  async authenticateWithGoogle(credential: string): Promise<{
    token: string
    user: AuthenticatedUser
  }> {
    let payload: TokenPayload | undefined
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.googleClientId
      })
      payload = ticket.getPayload()
    } catch (error) {
      this.logger.warn("Google token verification failed")
      throw new UnauthorizedException("Invalid Google credential")
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException("Invalid Google credential payload")
    }

    const email = payload.email.trim().toLowerCase()
    if (!this.allowedGoogleEmails.has(email)) {
      this.logger.warn("Google login rejected: identity is not allowlisted")
      throw new UnauthorizedException("Google account is not authorized")
    }

    const user: AuthenticatedUser = {
      id: payload.sub,
      email,
      name: payload.name || null,
      picture: payload.picture || null
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    })

    return { token, user }
  }
}
