import { ConfigService } from "@nestjs/config"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINIMUM_JWT_SECRET_LENGTH = 32

export function parseAllowedGoogleEmails(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function getRequiredConfig(
  configService: ConfigService,
  key: "GOOGLE_CLIENT_ID" | "JWT_SECRET" | "ALLOWED_GOOGLE_EMAILS"
): string {
  const value = configService.get<string>(key)?.trim()

  if (!value) {
    throw new Error(`${key} is required`)
  }

  return value
}

export function validateAuthConfig(
  config: Record<string, unknown>
): Record<string, unknown> {
  const googleClientId = String(config.GOOGLE_CLIENT_ID || "").trim()
  const jwtSecret = String(config.JWT_SECRET || "").trim()
  const allowedGoogleEmails = String(
    config.ALLOWED_GOOGLE_EMAILS || ""
  ).trim()

  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is required")
  }

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required")
  }

  if (jwtSecret.length < MINIMUM_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MINIMUM_JWT_SECRET_LENGTH} characters`
    )
  }

  const emails = parseAllowedGoogleEmails(allowedGoogleEmails)
  if (emails.size === 0) {
    throw new Error("ALLOWED_GOOGLE_EMAILS must contain at least one email")
  }

  for (const email of emails) {
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error("ALLOWED_GOOGLE_EMAILS contains an invalid email")
    }
  }

  return {
    ...config,
    GOOGLE_CLIENT_ID: googleClientId,
    JWT_SECRET: jwtSecret,
    ALLOWED_GOOGLE_EMAILS: [...emails].join(",")
  }
}
