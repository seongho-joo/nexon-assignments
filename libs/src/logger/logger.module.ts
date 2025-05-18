import { Global, Module } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger/logger.service';

@Global()
@Module({
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class LoggerModule {}
