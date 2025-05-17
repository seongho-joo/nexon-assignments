import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class InternalServerException extends BaseException {
  constructor(
    message: string = '서버 내부 오류가 발생했습니다',
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>,
    path?: string,
  ) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, code, details, path);
  }
}
