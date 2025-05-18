import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  timestamp: string;
  path?: string;
  details?: Record<string, any>;
}

export class BaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>,
    path?: string,
  ) {
    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      code,
      timestamp: new Date().toISOString(),
      path,
      details,
    };
    super(errorResponse, statusCode);
  }
}
