import { createClient, RedisClientType } from "redis";

let redis: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (redis) return redis;

  redis = createClient({
    url: process.env.REDIS_URL,
  });

  await redis.connect();
  return redis;
}

export async function cacheSubmission(submissionId: string, data: any, ttl = 86400) {
  const client = await getRedis();
  await client.setEx(`submission:${submissionId}`, ttl, JSON.stringify(data));
}

export async function getCachedSubmission(submissionId: string): Promise<any | null> {
  const client = await getRedis();
  const data = await client.get(`submission:${submissionId}`);
  return data ? JSON.parse(data) : null;
}

export async function cacheOCR(fileHash: string, text: string, ttl = 86400) {
  const client = await getRedis();
  await client.setEx(`ocr:${fileHash}`, ttl, text);
}

export async function getCachedOCR(fileHash: string): Promise<string | null> {
  const client = await getRedis();
  return await client.get(`ocr:${fileHash}`);
}

export async function cacheAIResults(submissionId: string, results: any, ttl = 86400) {
  const client = await getRedis();
  await client.setEx(`ai:${submissionId}`, ttl, JSON.stringify(results));
}

export async function getCachedAIResults(submissionId: string): Promise<any | null> {
  const client = await getRedis();
  const data = await client.get(`ai:${submissionId}`);
  return data ? JSON.parse(data) : null;
}
