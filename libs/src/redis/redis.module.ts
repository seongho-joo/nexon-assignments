import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { CustomLoggerService } from '@app/common/logger';
import { RedisService } from '@app/common/redis/redis.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new CustomLoggerService();
        logger.setContext('RedisModule');

        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        logger.log(`Redis 연결: ${redisUrl}`);
        return {
          store: redisStore,
          url: redisUrl,
          ttl: 60 * 60 * 24,
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
