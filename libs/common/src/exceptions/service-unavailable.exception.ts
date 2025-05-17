import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ServiceUnavailableException extends BaseException {
  constructor(
    message: string = '서비스를 일시적으로 사용할 수 없습니다',
    code: string = 'SERVICE_UNAVAILABLE',
    details?: Record<string, any>,
    path?: string,
  ) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, code, details, path);
  }
}
