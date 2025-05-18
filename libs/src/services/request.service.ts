import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger';
import { RequestRepository } from '@app/common/repositories/request.repository';
import { EventService } from './event.service';
import { CreateRequestDto } from '@app/common/dto/request';
import { Request, RequestStatus } from '@app/common/schemas';
import { BadRequestException } from '@app/common/exceptions';
import { RpcException } from '@nestjs/microservices';
import { RewardConditionValidatorService } from '@app/common/services/reward-condition-validator.service';

@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepository: RequestRepository,
    private readonly eventService: EventService,
    private readonly rewardConditionValidator: RewardConditionValidatorService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('RequestService');
  }

  async createRequest(createRequestDto: CreateRequestDto, userId: string): Promise<Request> {
    this.logger.log(`Creating request for event ${createRequestDto.eventId} by user ${userId}`);

    const event = await this.eventService.findEventById(createRequestDto.eventId);
    if (!event) {
      throw new RpcException(new BadRequestException('Event not found'));
    }

    if (!event.rewards || event.rewards.length === 0) {
      throw new RpcException(new BadRequestException('Event has no rewards'));
    }

    const existingRequest = await this.requestRepository.findByUserIdAndEventId(
      userId,
      createRequestDto.eventId,
    );
    if (existingRequest) {
      throw new RpcException(new BadRequestException('Reward already requested'));
    }

    // 보상 조건 검증
    for (const reward of event.rewards) {
      const validationResult = await this.rewardConditionValidator.validateCondition(
        reward.condition,
        userId,
      );

      if (!validationResult.isValid) {
        throw new RpcException(
          new BadRequestException(`보상 조건 불충족: ${validationResult.reason}`),
        );
      }
    }

    // 모든 조건이 충족되면 자동으로 승인 상태로 생성
    const request = await this.requestRepository.create({
      userId,
      eventId: createRequestDto.eventId,
      status: RequestStatus.APPROVED,
      approvedAt: new Date(),
    });

    // TODO: 보상 지급 로직 구현
    // 예: 유저의 포인트 증가, 아이템 지급 등

    this.logger.log(`Created and approved request ${request.requestId}`);
    return request;
  }

  async findRequestById(requestId: string): Promise<Request | null> {
    return this.requestRepository.findById(requestId);
  }
}
