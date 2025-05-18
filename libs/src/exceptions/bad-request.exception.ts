import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@app/common/exceptions/base.exception';

export class BadRequestException extends BaseException {
  constructor(
    message: string = '잘못된 요청입니다',
    code: string = 'BAD_REQUEST',
    details?: Record<string, any>,
    path?: string,
  ) {
    super(message, HttpStatus.BAD_REQUEST, code, details, path);
  }
}
