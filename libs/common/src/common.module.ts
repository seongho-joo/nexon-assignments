import { Module } from '@nestjs/common';
import { LoggerModule } from './logger';

@Module({
  imports: [LoggerModule],
  exports: [LoggerModule],
})
export class CommonModule {}
