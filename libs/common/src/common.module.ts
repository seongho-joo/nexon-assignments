import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common/logger';
import { DbModule } from '@app/common/db';
import { RedisModule } from '@app/common/redis';

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
