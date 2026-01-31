import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import { DailyStats } from './types';

// Unified Redis interface
interface RedisClient {
  get(key: string): Promise<number | null>;
  incrby(key: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

// Initialize Redis client (supports both Upstash and Railway Redis)
let redis: RedisClient | null = null;

try {
  // Option 1: Upstash Redis (REST API) - for Vercel or manual setup
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const upstashClient = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    redis = {
      async get(key: string): Promise<number | null> {
        const value = await upstashClient.get<number>(key);
        return value;
      },
      async incrby(key: string, increment: number): Promise<number> {
        return await upstashClient.incrby(key, increment);
      },
      async expire(key: string, seconds: number): Promise<number> {
        return await upstashClient.expire(key, seconds);
      },
    };

    console.log('✓ Redis initialized: Upstash (REST API)');
  }
  // Option 2: Railway Redis (standard Redis TCP) - for Railway deployment
  else if (process.env.REDIS_URL) {
    const ioredisClient = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    // Connect asynchronously
    ioredisClient.connect().catch((err) => {
      console.error('Failed to connect to Railway Redis:', err);
    });

    redis = {
      async get(key: string): Promise<number | null> {
        const value = await ioredisClient.get(key);
        return value ? parseInt(value, 10) : null;
      },
      async incrby(key: string, increment: number): Promise<number> {
        return await ioredisClient.incrby(key, increment);
      },
      async expire(key: string, seconds: number): Promise<number> {
        return await ioredisClient.expire(key, seconds);
      },
    };

    console.log('✓ Redis initialized: Railway (REDIS_URL)');
  } else {
    console.warn('⚠️  No Redis configured - usage tracking disabled');
  }
} catch (error) {
  console.error('Redis initialization error:', error);
  redis = null;
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getTodayKey(group: 'friends' | 'owner'): string {
  const today = new Date().toISOString().split('T')[0];
  return `usage:${group}:${today}`;
}

/**
 * Get daily usage in seconds for a group
 */
export async function getDailyUsage(group: 'friends' | 'owner'): Promise<number> {
  if (!redis) return 0;

  try {
    const key = getTodayKey(group);
    const usage = await redis.get(key);
    return usage || 0;
  } catch (error) {
    console.error('Error getting daily usage:', error);
    return 0;
  }
}

/**
 * Track usage for a group
 */
export async function trackUsage(group: 'friends' | 'owner', durationInSeconds: number): Promise<void> {
  if (!redis) return;

  try {
    const key = getTodayKey(group);

    // Increment usage
    await redis.incrby(key, Math.floor(durationInSeconds));

    // Set expiration to end of next day (auto-cleanup)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(0, 0, 0, 0);
    const expirationSeconds = Math.floor((tomorrow.getTime() - Date.now()) / 1000);

    await redis.expire(key, expirationSeconds);
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

/**
 * Check if friends group has exceeded daily limit
 */
export async function checkDailyLimit(group: 'friends'): Promise<{
  allowed: boolean;
  hoursUsed: number;
  hoursRemaining: number;
}> {
  const FRIENDS_DAILY_LIMIT_HOURS = 8;
  const limitInSeconds = FRIENDS_DAILY_LIMIT_HOURS * 3600;

  const usageInSeconds = await getDailyUsage(group);
  const hoursUsed = usageInSeconds / 3600;
  const allowed = usageInSeconds < limitInSeconds;
  const hoursRemaining = Math.max(0, FRIENDS_DAILY_LIMIT_HOURS - hoursUsed);

  return {
    allowed,
    hoursUsed: Math.round(hoursUsed * 10) / 10, // Round to 1 decimal
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
  };
}

/**
 * Get usage stats for the last N days
 */
export async function getUsageStats(group: 'friends' | 'owner', days: number = 30): Promise<DailyStats[]> {
  if (!redis) return [];

  try {
    const stats: DailyStats[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `usage:${group}:${dateStr}`;

      const usageInSeconds = await redis.get(key);
      const hours = usageInSeconds ? usageInSeconds / 3600 : 0;

      stats.push({
        date: dateStr,
        hours: Math.round(hours * 10) / 10,
      });
    }

    return stats.reverse(); // Oldest first
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return [];
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null;
}
