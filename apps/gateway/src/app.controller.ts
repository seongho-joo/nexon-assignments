import { Controller, Get } from '@nestjs/common';
import { CustomLoggerService } from '@app/common';

@Controller()
export class AppController {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('GatewayController');
  }

  @Get()
  getHello(): string {
    this.logger.log('getHello 엔드포인트가 호출되었습니다.');
    return 'Hello World!';
  }
}
