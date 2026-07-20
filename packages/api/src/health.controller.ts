import { Controller, Get } from "@nestjs/common"
import { DataSource } from "typeorm"
import { Public } from "./auth/public.decorator"

@Controller("health")
@Public()
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Get()
  async check() {
    let dbStatus = "unknown"
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query("SELECT 1")
        dbStatus = "connected"
      } else {
        dbStatus = "not initialized"
      }
    } catch (error) {
      dbStatus = `error: ${error.message}`
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbStatus,
    }
  }
}
