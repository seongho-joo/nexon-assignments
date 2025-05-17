import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ForbiddenException extends BaseException {
  constructor(
    message: string = '접근 권한이 없습니다',
    code: string = 'FORBIDDEN',
    details?: Record<string, any>,
    path?: string,
  ) {
    super(message, HttpStatus.FORBIDDEN, code, details, path);
  }
}
