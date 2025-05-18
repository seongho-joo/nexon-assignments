import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@app/common/exceptions/base.exception';

export class UnexpectedException extends BaseException {
  constructor(
    message: string = '예상치 못한 오류가 발생했습니다',
    code: string = 'UNEXPECTED_ERROR',
    details?: Record<string, any>,
    path?: string,
  ) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, code, details, path);
  }
}
