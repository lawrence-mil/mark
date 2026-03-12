import { Elysia } from "elysia";
import { db } from "../../lib/database/client";
import { getRedis } from "../../lib/cache/client";

export const healthRouter = new Elysia({ prefix: "/api" })
  .get("/health", async ({ set }) => {
    const health: any = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      services: {
        db: false,
        redis: false,
        ocr: false,
        ai: false,
      },
      variables: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        REDIS_URL: !!process.env.REDIS_URL,
        MISTRAL_API_KEY: !!process.env.MISTRAL_API_KEY,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
        EXA_API_KEY: !!process.env.EXA_API_KEY,
        RAILWAY_STATIC_URL: !!process.env.RAILWAY_STATIC_URL,
        RAILWAY_PUBLIC_DOMAIN: !!process.env.RAILWAY_PUBLIC_DOMAIN,
      },
    };

    // Check database
    try {
      await db.execute("SELECT 1");
      health.services.db = true;
    } catch (error) {
      console.error("Health check - DB failed:", error);
      health.services.db = { error: error instanceof Error ? error.message : "Unknown error" };
    }

    // Check Redis
    try {
      const redis = await getRedis();
      await redis.ping();
      health.services.redis = true;
    } catch (error) {
      console.error("Health check - Redis failed:", error);
      health.services.redis = { error: error instanceof Error ? error.message : "Unknown error" };
    }

    // Check OCR (Mistral API key exists)
    health.services.ocr = !!process.env.MISTRAL_API_KEY;
    if (!health.services.ocr) {
      health.services.ocr = { error: "MISTRAL_API_KEY not set" };
    }

    // Check AI (OpenRouter API key exists)
    health.services.ai = !!process.env.OPENROUTER_API_KEY;
    if (!health.services.ai) {
      health.services.ai = { error: "OPENROUTER_API_KEY not set" };
    }

    // Overall status
    const coreHealthy = health.services.db === true && health.services.redis === true;
    health.status = coreHealthy ? "ok" : "degraded";
    set.status = coreHealthy ? 200 : 503;

    return health;
  });
