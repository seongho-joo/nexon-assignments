import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { DbModule } from './db/db.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.template.env'],
    }),
    LoggerModule,
    DbModule,
    RedisModule,
  ],
  exports: [LoggerModule, DbModule, RedisModule],
})
export class CommonModule {}
