import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { config } from "dotenv";
import { submissionsRouter } from "./api/submissions";
import { resultsRouter } from "./api/results";
import { healthRouter } from "./api/health";
import { authRouter } from "./api/auth";
import { bugRouter } from "./api/bugs";

config();

const app = new Elysia()
  .use(cors())
  // API Routes - must be before static plugin
  .use(submissionsRouter)
  .use(resultsRouter)
  .use(healthRouter)
  .use(authRouter)
  .use(bugRouter)
  // Serve static frontend files
  .use(staticPlugin({
    assets: "dist",
    prefix: "/",
    ignorePatterns: ["/api/*"]
  }))
  // SPA Fallback for React Router - only for non-API routes
  .get("/*", ({ path }) => {
    if (path.startsWith("/api")) return;
    return Bun.file("dist/index.html");
  })
  .listen(process.env.PORT || 3000);

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
