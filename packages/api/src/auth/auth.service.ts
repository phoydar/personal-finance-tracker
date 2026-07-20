import { Injectable, UnauthorizedException, Logger } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ConfigService } from "@nestjs/config"
import { OAuth2Client } from "google-auth-library"
import { User } from "../database/entities"

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly googleClient: OAuth2Client

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>("GOOGLE_CLIENT_ID")
    )
  }

  async authenticateWithGoogle(credential: string): Promise<{
    token: string
    user: { id: string; email: string; name: string | null; picture: string | null }
  }> {
    // Verify the Google ID token
    let payload: any
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.get<string>("GOOGLE_CLIENT_ID")
      })
      payload = ticket.getPayload()
    } catch (error) {
      this.logger.error("Google token verification failed:", error)
      throw new UnauthorizedException("Invalid Google credential")
    }

    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException("Invalid Google credential payload")
    }

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { googleId: payload.sub }
    })

    if (!user) {
      user = this.userRepository.create({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || null,
        picture: payload.picture || null
      })
      user = await this.userRepository.save(user)
      this.logger.log(`New user created: ${user.email}`)
    } else {
      // Update profile info on each login
      user.email = payload.email
      user.name = payload.name || user.name
      user.picture = payload.picture || user.picture
      user = await this.userRepository.save(user)
    }

    // Sign JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email
    })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    }
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    })

    if (!user) {
      throw new UnauthorizedException("User not found")
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    }
  }
}
