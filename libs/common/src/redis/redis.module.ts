import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { CustomLoggerService } from '@app/common/logger';
import { RedisClientType } from 'redis';
import { RedisService } from '@app/common/redis/redis.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new CustomLoggerService();
        logger.setContext('RedisModule');

        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('REDIS_PORT') || 6379;
        const username = configService.get<string>('REDIS_USERNAME') || '';
        const password = configService.get<string>('REDIS_PASSWORD') || '';
        const db = configService.get<number>('REDIS_DB') || 0;

        logger.log(`Redis 연결: ${host}:${port}`);

        return {
          store: redisStore,
          host,
          port,
          username,
          password,
          db,
          ttl: 60 * 60 * 24,
          retryStrategy: (times: number) => {
            logger.warn(`Redis 연결 재시도... (${times}번째)`);
            return Math.min(times * 100, 3000); // 최대 3초 간격으로 재시도
          },
          onClientCreated: (client: RedisClientType) => {
            client.on('error', (err: Error) => {
              logger.error('Redis 클라이언트 오류', err);
            });
            client.on('connect', () => {
              logger.log('Redis 서버에 연결되었습니다.');
            });
            client.on('reconnecting', () => {
              logger.warn('Redis 서버에 재연결 중...');
            });
          },
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
