import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { RequestService } from '@app/common/services/request.service';
import { BaseResponseDto, GatewayCommandEnum } from '@app/common/dto';
import {
  CreateRequestDto,
  RequestResponseDto,
  RequestListResponseDto,
} from '@app/common/dto/request';
import { plainToClass } from 'class-transformer';
import { BadRequestException, NotFoundException } from '@app/common/exceptions';

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
  async handleRequest(data: {
    path: string;
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<unknown>> {
    this.logger.log(`Received proxy request for path: ${data.path}, method: ${data.method}`);

    // GET /requests
    if (data.path === 'requests' && data.method === 'GET') {
      return this.handleGetRequests();
    }

    // POST /requests
    if (data.path === 'requests' && data.method === 'POST') {
      return this.handleCreateRequest(data);
    }

    // GET /requests/:requestId
    const requestMatch = data.path.match(/^requests\/([^/]+)$/);
    if (requestMatch && data.method === 'GET') {
      const requestId = requestMatch[1];
      return this.handleGetRequestById(requestId);
    }

    // GET /users/:userId/requests
    const userRequestsMatch = data.path.match(/^users\/([^/]+)\/requests$/);
    if (userRequestsMatch && data.method === 'GET') {
      const userId = userRequestsMatch[1];
      return this.handleGetUserRequests(userId);
    }

    // GET /users/:userId/requests/:requestId
    const userRequestMatch = data.path.match(/^users\/([^/]+)\/requests\/([^/]+)$/);
    if (userRequestMatch && data.method === 'GET') {
      const [, , requestId] = userRequestMatch;
      return this.handleGetUserRequest(requestId);
    }

    throw new RpcException(new NotFoundException(`Cannot ${data.method} /${data.path}`));
  }

  private async handleGetRequests(): Promise<BaseResponseDto<RequestListResponseDto>> {
    const { requests, totalCount } = await this.requestService.findAllRequests();
    const response: RequestListResponseDto = {
      requests: requests.map(req => plainToClass(RequestResponseDto, req)),
      totalCount,
    };

    return {
      statusCode: HttpStatus.OK,
      message: '요청 목록을 성공적으로 조회했습니다.',
      data: response,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleGetRequestById(
    requestId: string,
  ): Promise<BaseResponseDto<RequestResponseDto>> {
    const request = await this.requestService.findRequestById(requestId);
    const response = plainToClass(RequestResponseDto, request);

    return {
      statusCode: HttpStatus.OK,
      message: '요청을 성공적으로 조회했습니다.',
      data: response,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleGetUserRequests(
    userId: string,
  ): Promise<BaseResponseDto<RequestListResponseDto>> {
    const { requests, totalCount } = await this.requestService.findRequestsByUserId(userId);
    const response: RequestListResponseDto = {
      requests: requests.map(req => plainToClass(RequestResponseDto, req)),
      totalCount,
    };

    return {
      statusCode: HttpStatus.OK,
      message: '사용자의 요청 목록을 성공적으로 조회했습니다.',
      data: response,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleGetUserRequest(
    requestId: string,
  ): Promise<BaseResponseDto<RequestResponseDto>> {
    const request = await this.requestService.findRequestById(requestId);
    const response = plainToClass(RequestResponseDto, request);

    return {
      statusCode: HttpStatus.OK,
      message: '요청을 성공적으로 조회했습니다.',
      data: response,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleCreateRequest(data: {
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<RequestResponseDto>> {
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
}
