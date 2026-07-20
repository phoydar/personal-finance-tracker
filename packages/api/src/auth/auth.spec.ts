import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Reflector } from "@nestjs/core"
import { JwtService } from "@nestjs/jwt"
import { HealthController } from "../health.controller"
import {
  getRequiredConfig,
  parseAllowedGoogleEmails,
  validateAuthConfig
} from "./auth.config"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./jwt-auth.guard"
import { JwtStrategy } from "./jwt.strategy"
import { IS_PUBLIC_KEY } from "./public.decorator"

const validConfig = {
  GOOGLE_CLIENT_ID: "expected-google-client-id",
  JWT_SECRET: "a-secure-random-secret-that-is-long-enough",
  ALLOWED_GOOGLE_EMAILS: "owner@example.com"
}

describe("auth configuration", () => {
  for (const key of [
    "GOOGLE_CLIENT_ID",
    "JWT_SECRET",
    "ALLOWED_GOOGLE_EMAILS"
  ]) {
    it(`fails closed when ${key} is missing`, () => {
      assert.throws(
        () => validateAuthConfig({ ...validConfig, [key]: "" }),
        new RegExp(key)
      )
    })
  }

  it("rejects a weak JWT secret", () => {
    assert.throws(
      () => validateAuthConfig({ ...validConfig, JWT_SECRET: "too-short" }),
      /at least 32 characters/
    )
  })

  it("normalizes and deduplicates allowed identities", () => {
    assert.deepEqual(
      parseAllowedGoogleEmails(
        " Owner@Example.com,owner@example.com, second@example.com "
      ),
      new Set(["owner@example.com", "second@example.com"])
    )
  })

  it("requires non-blank configuration outside ConfigModule validation", () => {
    const configService = new ConfigService({ JWT_SECRET: "  " })
    assert.throws(
      () => getRequiredConfig(configService, "JWT_SECRET"),
      /JWT_SECRET is required/
    )
  })
})

function createAuthService() {
  const signedPayloads: unknown[] = []
  const jwtService = {
    sign: (payload: unknown) => {
      signedPayloads.push(payload)
      return "signed-jwt"
    }
  } as JwtService
  const service = new AuthService(jwtService, new ConfigService(validConfig))
  let payload: unknown
  let verificationError: Error | undefined
  const verificationCalls: unknown[] = []

  ;(service as any).googleClient = {
    verifyIdToken: async (options: unknown) => {
      verificationCalls.push(options)
      if (verificationError) throw verificationError
      return { getPayload: () => payload }
    }
  }

  return {
    service,
    signedPayloads,
    verificationCalls,
    setPayload: (value: unknown) => {
      payload = value
    },
    failVerification: () => {
      verificationError = new Error("verification failed")
    }
  }
}

describe("AuthService", () => {
  it("accepts a verified allowlisted Google identity", async () => {
    const auth = createAuthService()
    auth.setPayload({
      sub: "google-subject",
      email: "Owner@Example.com",
      email_verified: true,
      name: "Owner",
      picture: "https://example.com/avatar.png"
    })

    assert.deepEqual(
      await auth.service.authenticateWithGoogle("credential"),
      {
        token: "signed-jwt",
        user: {
          id: "google-subject",
          email: "owner@example.com",
          name: "Owner",
          picture: "https://example.com/avatar.png"
        }
      }
    )
    assert.deepEqual(auth.verificationCalls, [
      {
        idToken: "credential",
        audience: "expected-google-client-id"
      }
    ])
    assert.deepEqual(auth.signedPayloads, [
      {
        sub: "google-subject",
        email: "owner@example.com",
        name: "Owner",
        picture: "https://example.com/avatar.png"
      }
    ])
  })

  it("rejects a verified identity that is not allowlisted", async () => {
    const auth = createAuthService()
    auth.setPayload({
      sub: "other-google-subject",
      email: "other@example.com",
      email_verified: true
    })

    await assert.rejects(
      () => auth.service.authenticateWithGoogle("credential"),
      UnauthorizedException
    )
    assert.equal(auth.signedPayloads.length, 0)
  })

  it("rejects an identity whose email is not verified", async () => {
    const auth = createAuthService()
    auth.setPayload({
      sub: "google-subject",
      email: "owner@example.com",
      email_verified: false
    })

    await assert.rejects(
      () => auth.service.authenticateWithGoogle("credential"),
      UnauthorizedException
    )
    assert.equal(auth.signedPayloads.length, 0)
  })

  it("rejects a credential that Google cannot verify", async () => {
    const auth = createAuthService()
    auth.failVerification()

    await assert.rejects(
      () => auth.service.authenticateWithGoogle("credential"),
      UnauthorizedException
    )
    assert.equal(auth.signedPayloads.length, 0)
  })
})

describe("JWT and route policy", () => {
  const strategy = new JwtStrategy(new ConfigService(validConfig))

  it("returns the allowlisted identity for guarded routes", () => {
    assert.deepEqual(
      strategy.validate({
        sub: "google-subject",
        email: "Owner@Example.com",
        name: "Owner"
      }),
      {
        id: "google-subject",
        email: "owner@example.com",
        name: "Owner",
        picture: null
      }
    )
  })

  it("invalidates tokens after an identity leaves the allowlist", () => {
    assert.throws(
      () =>
        strategy.validate({
          sub: "other-google-subject",
          email: "other@example.com"
        }),
      UnauthorizedException
    )
  })

  it("keeps only Google login and health public", () => {
    assert.equal(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.googleAuth
      ),
      true
    )
    assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController), true)
    assert.equal(
      Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.getProfile),
      undefined
    )
  })

  it("lets explicitly public routes bypass JWT authentication", () => {
    const reflector = {
      getAllAndOverride: () => true
    } as unknown as Reflector
    const guard = new JwtAuthGuard(reflector)
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined
    } as unknown as ExecutionContext

    assert.equal(guard.canActivate(context), true)
  })
})
