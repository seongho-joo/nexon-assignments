import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { createLogger, Logger, format, transports } from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements LoggerService {
  private context?: string;
  private logger: Logger;

  constructor() {
    this.initializeLogger();
  }

  private initializeLogger() {
    const { combine, timestamp, printf, colorize, json } = format;

    const logFormat = printf(info => {
      const ts = info.timestamp as string;
      const level = info.level;
      const ctx = info.context ? `[${info.context as string}]` : '';
      const msg = info.message as string;
      const trace = info.trace;

      const meta = { ...info };
      ['timestamp', 'level', 'message', 'context', 'trace'].forEach(key => {
        delete meta[key];
      });

      Object.keys(meta).forEach(key => {
        if (meta[key] === undefined) {
          delete meta[key];
        }
      });

      const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';

      const traceStr = trace ? `\n${JSON.stringify(trace, null, 2)}` : '';

      return `[${ts}][${level}]${ctx} ${msg}${metaStr}${traceStr}`.trim();
    });

    this.logger = createLogger({
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json(), logFormat),
      transports: [
        new transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          format: combine(colorize({ all: true }), logFormat),
        }),

        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),

        new transports.File({
          filename: 'logs/combined.log',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logMessage('debug', message, optionalParams);
  }

  log(message: any, ...optionalParams: any[]) {
    this.logMessage('info', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logMessage('warn', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    const trace = this.getErrorTrace(optionalParams);
    this.logMessage('error', message, optionalParams, trace);
  }

  private getErrorTrace(params: any[]): string | undefined {
    if (params.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const lastParam = params[params.length - 1];
      if (lastParam instanceof Error) {
        params.pop(); // 에러 객체 제거
        return lastParam.stack;
      }
    }
    return undefined;
  }

  private logMessage(level: string, message: any, params: any[] = [], trace?: string) {
    const formattedMessage = this.formatMessage(message);

    this.logger.log({
      level,
      message: formattedMessage,
      context: this.context,
      trace,
      ...(params.length > 0 ? this.formatParams(params) : {}),
    });
  }

  private formatParams(params: any[] = []): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return params.reduce((acc, param, index) => {
      if (param !== null && typeof param === 'object') {
        Object.assign(acc, param);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        acc[`param${index}`] = param;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return acc;
    }, {});
  }

  private formatMessage(message: any): string {
    if (message instanceof Error) {
      return message.stack || message.message;
    }

    if (message !== null && typeof message === 'object') {
      try {
        return JSON.stringify(message);
      } catch {
        return '[객체를 문자열로 변환할 수 없음]';
      }
    }

    return String(message);
  }
}
