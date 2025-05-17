import { All, Controller, Get, HttpException, HttpStatus, Inject, Req, Res } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { catchError, throwError, timeout } from 'rxjs';
import { CustomLoggerService } from '@app/common/logger';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

interface ProxyPayload {
  path: string;
  method: string;
  body: {
    body: unknown;
    query: unknown;
    params: unknown;
    headers: unknown;
  };
}

@Controller()
export class ProxyController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('EVENT_SERVICE') private readonly eventClient: ClientProxy,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('ProxyController');
  }

  @Get('auth')
  handleAuthRequests(@Req() req: Request, @Res() res: Response): void {
    this.routeToMicroservice('AUTH', this.authClient, '', req, res);
  }

  @Get('event')
  handleEventRequests(@Req() req: Request, @Res() res: Response): void {
    this.routeToMicroservice('EVENT', this.eventClient, '', req, res);
  }

  @ApiExcludeEndpoint()
  @All('*')
  handleNotFound(@Req() req: Request, @Res() res: Response): void {
    this.logger.warn(`Unknown API path requested: ${req.method} ${req.url}`);
    res.status(HttpStatus.NOT_FOUND).json({
      statusCode: HttpStatus.NOT_FOUND,
      message: `Cannot ${req.method} ${req.path}`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  private routeToMicroservice(
    serviceName: string,
    client: ClientProxy,
    path: string,
    req: Request,
    res: Response,
  ): void {
    this.logger.log(
      `Routing request to ${serviceName} service${path ? `: ${req.method} ${req.url}` : ' root'}`,
    );

    const pattern = {
      cmd: 'proxy',
    };

    const payload: ProxyPayload = {
      path,
      method: req.method,
      body: {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      },
    };

    try {
      this.sendRequestToMicroservice(client, pattern, payload, serviceName, req, res);
    } catch (error) {
      this.handleUnexpectedError(error, serviceName, res);
    }
  }

  private sendRequestToMicroservice(
    client: ClientProxy,
    pattern: Record<string, unknown>,
    payload: ProxyPayload,
    serviceName: string,
    req: Request,
    res: Response,
  ): void {
    client
      .send<Record<string, unknown>>(pattern, payload)
      .pipe(
        timeout(10000),
        catchError(err => {
          this.logger.error(`Error from ${serviceName} service: ${err.message}`, err.stack);
          return throwError(
            () =>
              new HttpException(
                err.message || `${serviceName} Service Error`,
                err.status || HttpStatus.INTERNAL_SERVER_ERROR,
              ),
          );
        }),
      )
      .subscribe({
        next: data => {
          this.logger.log(`Response from ${serviceName} service for ${req.url}`);
          res.status(HttpStatus.OK).json(data);
        },
        error: (err: { message?: string; status?: number; stack?: string }) => {
          this.logger.error(
            `Error processing ${serviceName} service response: ${err.message ?? 'Unknown error'}`,
            err.stack,
          );
          const status: number =
            typeof err.status === 'number' ? err.status : HttpStatus.INTERNAL_SERVER_ERROR;
          res.status(status).json({
            error: err.message || 'An error occurred',
            statusCode: status,
            timestamp: new Date().toISOString(),
          });
        },
      });
  }

  private handleUnexpectedError(error: unknown, serviceName: string, res: Response): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.logger.error(
      `Unexpected error routing to ${serviceName} service: ${errorMessage}`,
      errorStack,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: `Gateway Error - Unable to communicate with ${serviceName} service`,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
    });
  }
}
