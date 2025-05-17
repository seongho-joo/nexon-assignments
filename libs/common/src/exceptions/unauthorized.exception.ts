import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class UnauthorizedException extends BaseException {
  constructor(
    message: string = '인증에 실패했습니다',
    code: string = 'UNAUTHORIZED',
    details?: Record<string, any>,
    path?: string,
  ) {
    super(message, HttpStatus.UNAUTHORIZED, code, details, path);
  }
}
