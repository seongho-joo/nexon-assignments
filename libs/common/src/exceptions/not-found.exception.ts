import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class NotFoundException extends BaseException {
  constructor(
    message: string = '리소스를 찾을 수 없습니다',
    code: string = 'RESOURCE_NOT_FOUND',
    details?: Record<string, any>,
    path?: string,
  ) {
    super(message, HttpStatus.NOT_FOUND, code, details, path);
  }
}
