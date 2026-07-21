import { Module } from "@nestjs/common"
import { ServeStaticModule } from "@nestjs/serve-static"
import { join } from "path"

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "..", "web", "build"),
      // Keep API requests in Nest. In particular, an unknown API route must
      // return a JSON 404 instead of the React application's index.html.
      exclude: ["/api/:path*"]
    })
  ]
})
export class WebModule {}
