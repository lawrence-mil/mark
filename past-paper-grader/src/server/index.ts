import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { submissionsRouter } from "./api/submissions";
import { resultsRouter } from "./api/results";
import { healthRouter } from "./api/health";

const app = new Elysia()
  .use(cors())
  // API Routes
  .use(submissionsRouter)
  .use(resultsRouter)
  .use(healthRouter)
  // Serve static frontend files
  .use(staticPlugin({
    assets: "dist",
    prefix: "/"
  }))
  // SPA Fallback for React Router
  .get("*", () => Bun.file("dist/index.html"))
  .listen(process.env.PORT || 3000);

console.log(`API running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
