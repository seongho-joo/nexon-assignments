import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger';
import { RequestRepository } from '@app/common/repositories/request.repository';
import { EventService } from './event.service';
import { CreateRequestDto } from '@app/common/dto/request/create-request.dto';
import { Request, RequestStatus } from '@app/common/schemas';
import { BadRequestException } from '@app/common/exceptions';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepository: RequestRepository,
    private readonly eventService: EventService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('RequestService');
  }

  async createRequest(createRequestDto: CreateRequestDto, userId: string): Promise<Request> {
    this.logger.log(`Creating request for event ${createRequestDto.eventId} by user ${userId}`);

    // 1. 이벤트 존재 여부 확인
    const event = await this.eventService.findEventById(createRequestDto.eventId);
    if (!event) {
      throw new RpcException(new BadRequestException('Event not found'));
    }

    // 2. 이벤트 보상 조건 확인
    if (!event.rewards || event.rewards.length === 0) {
      throw new RpcException(new BadRequestException('Event has no rewards'));
    }

    // 3. 중복 요청 확인
    const existingRequest = await this.requestRepository.findByUserIdAndEventId(
      userId,
      createRequestDto.eventId,
    );
    if (existingRequest) {
      throw new RpcException(new BadRequestException('Reward already requested'));
    }

    // 4. 보상 요청 생성
    const request = await this.requestRepository.create({
      userId,
      eventId: createRequestDto.eventId,
      status: RequestStatus.PENDING,
    });

    this.logger.log(`Created request ${request.requestId}`);
    return request;
  }

  async findRequestById(requestId: string): Promise<Request | null> {
    return this.requestRepository.findById(requestId);
  }

  async updateRequestStatus(
    requestId: string,
    status: RequestStatus,
    metadata?: Record<string, any>,
  ): Promise<Request> {
    const request = await this.requestRepository.updateStatus(requestId, status, metadata);
    if (!request) {
      throw new RpcException(new BadRequestException('Request not found'));
    }
    return request;
  }
}
