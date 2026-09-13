import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { boot } from "./index.js";
import { createApp } from "./http/app.js";

const profile = process.env.MW_PROFILE ?? "standalone-business";
const env = await boot({ profile });
const app = createApp(env);
const dist = resolve(process.cwd(), "web/dist");

if (process.env.NODE_ENV === "production" && existsSync(dist)) {
  app.use("/*", serveStatic({ root: "./web/dist" }));
  app.get("*", serveStatic({ path: "./web/dist/index.html" }));
}

const port = Number(process.env.MW_EDGE_PORT ?? 8788);
const hostname = process.env.MW_EDGE_HOST ?? "127.0.0.1";
const server = serve({ fetch: app.fetch, port, hostname });

console.log(JSON.stringify({ event: "mw-edge.started", profile, hostname, port, models: env.registry.list().length }));

const shutdown = (): void => {
  server.close(() => {
    env.close();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
