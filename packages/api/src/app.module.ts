import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { PlaidModule } from "./plaid/plaid.module"
import { AccountsModule } from "./accounts/accounts.module"
import { TransactionsModule } from "./transactions/transactions.module"
import { NetworthModule } from "./networth/networth.module"
import { HealthController } from "./health.controller"
import { InitialSchema1706900000000 } from "./database/migrations/1706900000000-InitialSchema"

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"]
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get<string>("DATABASE_URL"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        migrations: [InitialSchema1706900000000],
        migrationsRun: true, // Auto-run migrations on startup
        synchronize: false, // Never use synchronize in production
        logging: true, // Enable logging to see migration output
        ssl:
          configService.get<string>("NODE_ENV") === "production"
            ? { rejectUnauthorized: false }
            : false,
        retryAttempts: 10,
        retryDelay: 3000
      })
    }),

    // Feature modules
    PlaidModule,
    AccountsModule,
    TransactionsModule,
    NetworthModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
