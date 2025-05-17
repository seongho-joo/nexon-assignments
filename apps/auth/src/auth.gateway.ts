import { Controller, NotFoundException } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';

interface ProxyPayload {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: unknown;
}

@Controller()
export class AuthGateway {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('AuthGateway');
  }

  @MessagePattern({ cmd: 'proxy' })
  handleProxyRequest(data: {
    path: string;
    method: string;
    body: ProxyPayload;
  }): Record<string, unknown> {
    this.logger.log(`Received proxy request for path: ${data.path}, method: ${data.method}`);

    switch (data.path) {
      case '':
        return this.handleRoot(data);
      default:
        // 알 수 없는 경로에 대한 404 응답
        this.logger.warn(`Unknown path requested in Auth service: ${data.path}`);
        throw new NotFoundException(`Cannot ${data.method} /${data.path}`);
    }
  }

  private handleRoot(data: any): Record<string, unknown> {
    return {
      message: 'Auth service API',
      version: '1.0',
      timestamp: new Date().toISOString(),
      endpoints: [''],
      method: data.method,
    };
  }
}
