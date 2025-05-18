import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisClient } from 'redis';
import { CustomLoggerService } from '@app/common/logger';

@Injectable()
export class RedisService {
  private readonly client: RedisClient;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('RedisService');
    this.client = (this.cacheManager.store as any).getClient();
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.cacheManager.set(key, value, { ttl });
      } else {
        await this.cacheManager.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error saving data to Redis (key: ${key})`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value ?? null;
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

  async increment(key: string): Promise<number> {
    try {
      return await new Promise<number>((resolve, reject) => {
        this.client.incrby(key, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } catch (error) {
      this.logger.error(`Error incrementing Redis key (key: ${key})`, error);
      throw error;
    }
  }

  async setTTL(key: string, ttl: number): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.client.expire(key, ttl, err => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      this.logger.error(`Error setting TTL on Redis key (key: ${key})`, error);
      throw error;
    }
  }

  async sAdd(key: string, ...members: string[]): Promise<number> {
    try {
      return await new Promise<number>((resolve, reject) => {
        this.client.sadd(key, members, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } catch (error) {
      this.logger.error(`Error adding members to Redis Set (key: ${key})`, error);
      throw error;
    }
  }

  async sMembers(key: string): Promise<string[]> {
    try {
      return await new Promise<string[]>((resolve, reject) => {
        this.client.smembers(key, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } catch (error) {
      this.logger.error(`Error fetching members from Redis Set (key: ${key})`, error);
      throw error;
    }
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      return await new Promise<boolean>((resolve, reject) => {
        this.client.sismember(key, member, (err, reply) => {
          if (err) reject(err);
          else resolve(reply === 1);
        });
      });
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
      return await new Promise<number>((resolve, reject) => {
        this.client.srem(key, members, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } catch (error) {
      this.logger.error(`Error removing members from Redis Set (key: ${key})`, error);
      throw error;
    }
  }

  async sCard(key: string): Promise<number> {
    try {
      return await new Promise<number>((resolve, reject) => {
        this.client.scard(key, (err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
    } catch (error) {
      this.logger.error(`Error getting cardinality of Redis Set (key: ${key})`, error);
      throw error;
    }
  }
}
