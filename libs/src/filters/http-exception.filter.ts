import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ErrorResponse } from '@app/common/exceptions';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse = {
      statusCode,
      message: '서버 내부 오류가 발생했습니다',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse &&
        'code' in exceptionResponse
      ) {
        errorResponse = {
          ...(exceptionResponse as Record<string, unknown>),
          path: request.url,
        } as ErrorResponse;
      } else {
        let message = exception.message;

        if (
          typeof exceptionResponse === 'object' &&
          exceptionResponse &&
          'message' in exceptionResponse
        ) {
          const messageValue = (exceptionResponse as Record<string, unknown>).message;
          message = typeof messageValue === 'string' ? messageValue : String(messageValue);
        }

        errorResponse = {
          statusCode,
          message,
          code: this.getCodeFromStatus(statusCode),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    } else if (exception instanceof Error) {
      errorResponse.message = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url} - ${statusCode}: ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(statusCode).json(errorResponse);
  }

  private getCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
