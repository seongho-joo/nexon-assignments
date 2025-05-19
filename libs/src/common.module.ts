import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common/logger';
import { DbModule } from '@app/common/db';
import { RedisModule } from '@app/common/redis';
import { PlayTimeTrackerService } from '@app/common/services/play-time-tracker.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    LoggerModule,
    DbModule,
    RedisModule,
  ],
  providers: [PlayTimeTrackerService],
  exports: [LoggerModule, DbModule, RedisModule, PlayTimeTrackerService],
})
export class CommonModule {}
