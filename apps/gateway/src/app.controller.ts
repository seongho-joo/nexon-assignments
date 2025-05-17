import { Controller, Get, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { HealthResponseDto, PingResponseDto, ServiceNameEnum } from '@app/common/dto';
import { CustomLoggerService } from '@app/common/logger';
import { RedisService } from '@app/common/redis';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';

@ApiTags('Gateway')
@Controller()
export class AppController {
  private readonly authServiceUrl: string;
  private readonly eventServiceUrl: string;

  constructor(
    private readonly logger: CustomLoggerService,
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext('GatewayController');
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001/api/auth';
    this.eventServiceUrl =
      this.configService.get<string>('EVENT_SERVICE_URL') || 'http://localhost:3002/api/event';
  }

  @Get()
  @ApiOperation({ summary: 'Gateway health check' })
  @ApiOkResponse({
    description: 'Gateway 서비스가 정상 작동 중',
    type: PingResponseDto,
  })
  ping(): PingResponseDto {
    this.logger.log('Gateway is running');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: ServiceNameEnum.GATEWAY,
    };
  }

  @Get('health')
  @ApiOperation({ summary: '모든 의존 서비스의 상태 확인' })
  @ApiOkResponse({
    description: '모든 서비스가 정상 작동 중',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: '하나 이상의 서비스가 정상 작동하지 않음',
    type: HealthResponseDto,
  })
  async checkHealth(): Promise<HealthResponseDto> {
    const response: HealthResponseDto = {
      status: 'ok',
      services: {
        mongodb: {
          status: 'ok',
        },
        redis: {
          status: 'ok',
        },
        auth: {
          status: 'ok',
        },
        event: {
          status: 'ok',
        },
      },
    };

    try {
      await this.checkMongoHealth();
    } catch (error: unknown) {
      this.logger.error('MongoDB health check failed', error);
      response.services.mongodb = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      response.status = 'error';
    }

    try {
      await this.checkRedisHealth();
    } catch (error: unknown) {
      this.logger.error('Redis health check failed', error);
      response.services.redis = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      response.status = 'error';
    }

    try {
      await this.checkAuthServiceHealth();
    } catch (error: unknown) {
      this.logger.error('Auth service health check failed', error);
      response.services.auth = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      response.status = 'error';
    }

    try {
      await this.checkEventServiceHealth();
    } catch (error: unknown) {
      this.logger.error('Event service health check failed', error);
      response.services.event = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      response.status = 'error';
    }

    if (response.status === 'error') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private async checkMongoHealth(): Promise<void> {
    // MongoDB readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyState = this.mongoConnection.readyState as number;
    if (readyState !== 1) {
      throw new Error(`MongoDB connection is not ready (state: ${readyState})`);
    }

    if (this.mongoConnection.db) {
      await this.mongoConnection.db.admin().ping();
    } else {
      throw new Error('MongoDB database not available');
    }
  }

  private async checkRedisHealth(): Promise<void> {
    const testKey = 'health:check:test';
    const testValue = 'ok';

    await this.redisService.set(testKey, testValue, 10); // 10초 TTL
    const result = await this.redisService.get<string>(testKey);

    if (result !== testValue) {
      throw new Error('Redis read/write test failed');
    }
  }

  private async checkAuthServiceHealth(): Promise<void> {
    try {
      const request = this.httpService.get(`${this.authServiceUrl}`).pipe(
        timeout(3000),
        catchError((error: AxiosError) => {
          throw new Error(`Auth service request failed: ${error.message}`);
        }),
      );

      const response = await firstValueFrom(request);

      if (response.status !== 200) {
        throw new Error(`Auth service returned non-OK status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `Auth service health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async checkEventServiceHealth(): Promise<void> {
    try {
      const request = this.httpService.get(`${this.eventServiceUrl}`).pipe(
        timeout(3000),
        catchError((error: AxiosError) => {
          throw new Error(`Event service request failed: ${error.message}`);
        }),
      );

      const response = await firstValueFrom(request);

      if (response.status !== HttpStatus.OK) {
        throw new Error(`Event service returned non-OK status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `Event service health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
