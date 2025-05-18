import { Controller, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { RequestService } from '@app/common/services/request.service';
import { BaseResponseDto, GatewayCommandEnum } from '@app/common/dto';
import { CreateRequestDto, RequestResponseDto } from '@app/common/dto/request';
import { plainToClass } from 'class-transformer';

interface ProxyPayload {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Record<string, unknown>;
}

@Controller()
export class RequestGateway {
  constructor(
    private readonly logger: CustomLoggerService,
    private readonly requestService: RequestService,
  ) {
    this.logger.setContext('RequestGateway');
  }

  @MessagePattern({ cmd: GatewayCommandEnum.REQUEST })
  async handleProxyRequest(data: {
    path: string;
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<unknown>> {
    this.logger.log(`Received proxy request for path: ${data.path}, method: ${data.method}`);

    const requestIdMatch = data.path.match(/^requests\/([^/]+)$/);

    if (data.path === 'requests') {
      return this.handleRequests(data);
    } else if (requestIdMatch) {
      return this.handleRequestById({ ...data, requestId: requestIdMatch[1] });
    }

    this.logger.warn(`Unknown path requested in Request service: ${data.path}`);
    throw new RpcException(new NotFoundException(`Cannot ${data.method} /${data.path}`));
  }

  private async handleRequests(data: {
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<RequestResponseDto>> {
    if (data.method === 'POST') {
      const createRequestDto = data.body.body as CreateRequestDto;
      const userId = data.body.headers['user-id'] as string;

      if (!userId) {
        throw new RpcException(new BadRequestException('User ID is required'));
      }

      const request = await this.requestService.createRequest(createRequestDto, userId);
      const response = plainToClass(RequestResponseDto, request);

      return {
        statusCode: HttpStatus.CREATED,
        message: '보상 요청이 성공적으로 생성되었습니다.',
        data: response,
        timestamp: new Date().toISOString(),
      };
    }

    throw new RpcException(
      new BadRequestException(`Method ${data.method} not supported for requests`),
    );
  }

  private async handleRequestById(data: {
    method: string;
    body: ProxyPayload;
    requestId: string;
  }): Promise<BaseResponseDto<RequestResponseDto>> {
    if (data.method === 'GET') {
      const request = await this.requestService.findRequestById(data.requestId);

      if (!request) {
        throw new RpcException(new NotFoundException('Request not found'));
      }

      const response = plainToClass(RequestResponseDto, request);

      return {
        statusCode: HttpStatus.OK,
        message: '보상 요청을 성공적으로 조회했습니다.',
        data: response,
        timestamp: new Date().toISOString(),
      };
    }

    throw new RpcException(
      new BadRequestException(`Method ${data.method} not supported for request by id`),
    );
  }
}
