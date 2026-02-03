import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)
  const frontendUrl = configService.get<string>(
    "FRONTEND_URL",
    "http://localhost:3000"
  )

  // Enable CORS for frontend
  app.enableCors({
    origin: [frontendUrl, "http://localhost:3000", "https://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
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
  await app.listen(port)

  console.log(`Finance Tracker API running on port ${port}`)
}

bootstrap()
