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
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly logger: CustomLoggerService,
  ) {
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

  async sAdd(key: string, ...members: string[]): Promise<number> {
    try {
      const client = this.getClient();
      return client.sAdd(key, members);
    } catch (error) {
      this.logger.error(`Error adding members to Redis Set (key: ${key})`, error);
      throw error;
    }
  }

  async sMembers(key: string): Promise<string[]> {
    try {
      const client = this.getClient();
      return client.sMembers(key);
    } catch (error) {
      this.logger.error(`Error fetching members from Redis Set (key: ${key})`, error);
      throw error;
    }
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      const client = this.getClient();
      return client.sIsMember(key, member);
    } catch (error) {
      this.logger.error(
        `Error checking member in Redis Set (key: ${key}, member: ${member})`,
        error,
      );
      throw error;
    }
  }

  async sRem(key: string, ...members: string[]): Promise<number> {
    try {
      const client = this.getClient();
      return client.sRem(key, members);
    } catch (error) {
      this.logger.error(`Error removing members from Redis Set (key: ${key})`, error);
      throw error;
    }
  }

  async sCard(key: string): Promise<number> {
    try {
      const client = this.getClient();
      return client.sCard(key);
    } catch (error) {
      this.logger.error(`Error getting cardinality of Redis Set (key: ${key})`, error);
      throw error;
    }
  }

  private getClient(): RedisClientType {
    return (this.cacheManager as RedisCache).store.getClient();
  }
}
