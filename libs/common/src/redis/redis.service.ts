import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import type { RedisClientType } from 'redis';
import { CustomLoggerService } from '@app/common/logger';

interface RedisCache extends Cache {
  store: {
    getClient(): RedisClientType;
  };
}

@Injectable()
export class RedisService {
  private readonly logger = new CustomLoggerService();

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    this.logger.setContext('RedisService');
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Error saving data to Redis (key: ${key})`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Error retrieving data from Redis (key: ${key})`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Error deleting data from Redis (key: ${key})`, error);
      throw error;
    }
  }

  async setTTL(key: string, ttl: number): Promise<void> {
    try {
      const client = this.getClient();
      await client.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Error setting TTL on Redis key (key: ${key})`, error);
      throw error;
    }
  }

  private getClient(): RedisClientType {
    return (this.cacheManager as RedisCache).store.getClient();
  }
}
