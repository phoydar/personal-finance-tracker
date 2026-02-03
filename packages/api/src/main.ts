import { NestFactory } from "@nestjs/core"
import { ValidationPipe, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AppModule } from "./app.module"

async function bootstrap() {
  const logger = new Logger("Bootstrap")

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log"]
    })

    const configService = app.get(ConfigService)
    const frontendUrl = configService.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000"
    )

    // Enable CORS for frontend
    app.enableCors({
      origin: [
        frontendUrl,
        "http://localhost:3000",
        "https://localhost:3000",
        "https://pshfinances.netlify.app"
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Accept"]
    })

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true
      })
    )

    // API prefix
    app.setGlobalPrefix("api")

    const port = configService.get<number>("PORT", 3001)

    // Listen on 0.0.0.0 for Railway/Docker
    await app.listen(port, "0.0.0.0")

    logger.log(`Finance Tracker API running on port ${port}`)
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`, error.stack)
    process.exit(1)
  }
}

bootstrap()
