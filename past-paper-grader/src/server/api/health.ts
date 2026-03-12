import { Elysia } from "elysia";
import { db } from "../../lib/database/client";
import { getRedis } from "../../lib/cache/client";

export const healthRouter = new Elysia({ prefix: "/api" })
  .get("/health", async () => {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        db: false,
        redis: false,
        ocr: false,
        ai: false,
      },
    };

    // Check database
    try {
      await db.execute("SELECT 1");
      health.services.db = true;
    } catch (error) {
      console.error("Health check - DB failed:", error);
    }

    // Check Redis
    try {
      const redis = await getRedis();
      await redis.ping();
      health.services.redis = true;
    } catch (error) {
      console.error("Health check - Redis failed:", error);
    }

    // Check OCR (Mistral API key exists)
    health.services.ocr = !!process.env.MISTRAL_API_KEY;

    // Check AI (OpenRouter API key exists)
    health.services.ai = !!process.env.OPENROUTER_API_KEY;

    // Overall status
    const allHealthy = Object.values(health.services).every(Boolean);
    health.status = allHealthy ? "ok" : "degraded";

    return health;
  });
