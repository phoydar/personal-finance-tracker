const assert = require("node:assert/strict")
const { after, before, test } = require("node:test")
const { Controller, Get, Module } = require("@nestjs/common")
const { NestFactory } = require("@nestjs/core")
const { WebModule } = require("../dist/web.module")

class HealthController {
  getHealth() {
    return { status: "ok" }
  }
}

Controller("health")(HealthController)
Get()(HealthController.prototype, "getHealth", {
  value: HealthController.prototype.getHealth
})

class StaticServingTestModule {}
Module({
  imports: [WebModule],
  controllers: [HealthController]
})(StaticServingTestModule)

let app
let baseUrl

before(async () => {
  app = await NestFactory.create(StaticServingTestModule, { logger: false })
  app.setGlobalPrefix("api")
  await app.listen(0, "127.0.0.1")
  const address = app.getHttpServer().address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await app.close()
})

test("serves the API health route instead of the SPA", async () => {
  const response = await fetch(`${baseUrl}/api/health`)

  assert.equal(response.status, 200)
  assert.match(response.headers.get("content-type"), /^application\/json/)
  assert.deepEqual(await response.json(), { status: "ok" })
})

test("keeps unknown API routes out of the SPA fallback", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`)

  assert.equal(response.status, 404)
  assert.match(response.headers.get("content-type"), /^application\/json/)
})

test("serves index.html for a client-side route", async () => {
  const response = await fetch(`${baseUrl}/accounts/example`)
  const body = await response.text()

  assert.equal(response.status, 200)
  assert.match(response.headers.get("content-type"), /^text\/html/)
  assert.match(body, /<div id="root"><\/div>/)
})
