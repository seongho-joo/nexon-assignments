import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common/logger';
import { DbModule } from '@app/common/db';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    DbModule,
  ],
  exports: [LoggerModule, DbModule],
})
export class CommonModule {}
