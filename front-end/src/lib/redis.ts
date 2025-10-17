// lib/redis.ts
import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient } from "redis";

// Check if using Upstash (production) or local Redis (development)
const isUpstash = !!process.env.UPSTASH_REDIS_REST_URL;

// Upstash Redis client (for production) - Auto-detects from env vars
let upstashClient: UpstashRedis | null = null;
if (isUpstash) {
  upstashClient = UpstashRedis.fromEnv();
}

// Local Redis client (for development)
let localClient: ReturnType<typeof createClient> | null = null;
if (!isUpstash) {
  localClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  localClient.on("error", (err) => console.error("Redis error:", err));
}

/**
 * Connect to Redis (only needed for local Redis, Upstash is REST-based)
 */
export async function connectRedis() {
  if (localClient && !localClient.isOpen) {
    await localClient.connect();
  }
  // Upstash doesn't need connection, it's REST-based
}

/**
 * Unified Redis interface that works with both Upstash and local Redis
 */
const redis = {
  async hSet(key: string, field: string, value: string) {
    if (upstashClient) {
      return await upstashClient.hset(key, { [field]: value });
    }
    if (localClient) {
      return await localClient.hSet(key, field, value);
    }
    throw new Error("No Redis client available");
  },

  async hGet(key: string, field: string): Promise<string | null> {
    if (upstashClient) {
      return await upstashClient.hget(key, field);
    }
    if (localClient) {
      return await localClient.hGet(key, field);
    }
    throw new Error("No Redis client available");
  },

  async hGetAll(key: string): Promise<Record<string, string>> {
    if (upstashClient) {
      const result = await upstashClient.hgetall<Record<string, string>>(key);
      return result || {};
    }
    if (localClient) {
      return await localClient.hGetAll(key);
    }
    throw new Error("No Redis client available");
  },

  async hDel(key: string, field: string) {
    if (upstashClient) {
      return await upstashClient.hdel(key, field);
    }
    if (localClient) {
      return await localClient.hDel(key, field);
    }
    throw new Error("No Redis client available");
  },

  async get(key: string): Promise<string | null> {
    if (upstashClient) {
      return await upstashClient.get(key);
    }
    if (localClient) {
      return await localClient.get(key);
    }
    throw new Error("No Redis client available");
  },

  async set(key: string, value: string) {
    if (upstashClient) {
      return await upstashClient.set(key, value);
    }
    if (localClient) {
      return await localClient.set(key, value);
    }
    throw new Error("No Redis client available");
  },

  async del(key: string) {
    if (upstashClient) {
      return await upstashClient.del(key);
    }
    if (localClient) {
      return await localClient.del(key);
    }
    throw new Error("No Redis client available");
  },

  async expire(key: string, seconds: number) {
    if (upstashClient) {
      return await upstashClient.expire(key, seconds);
    }
    if (localClient) {
      return await localClient.expire(key, seconds);
    }
    throw new Error("No Redis client available");
  },
};

export default redis;

// Export the raw clients for advanced usage if needed
export { upstashClient, localClient };
