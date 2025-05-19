import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger';
import { RequestRepository } from '@app/common/repositories/request.repository';
import { EventService } from './event.service';
import { CreateRequestDto } from '@app/common/dto/request';
import { Event, PointTransactionType, Request, RequestStatus, Reward } from '@app/common/schemas';
import { BadRequestException, InternalServerException } from '@app/common/exceptions';
import { RpcException } from '@nestjs/microservices';
import { RewardConditionValidatorService } from '@app/common/services/reward-condition-validator.service';
import { Types } from 'mongoose';
import { PointTransactionRepository } from '@app/common/repositories/point-transaction.repository';
import { UserRepository } from '@app/common/repositories/user.repository';

@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepository: RequestRepository,
    private readonly eventService: EventService,
    private readonly rewardConditionValidator: RewardConditionValidatorService,
    private readonly pointTransactionRepository: PointTransactionRepository,
    private readonly userRepository: UserRepository,
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
      await this.grantReward(reward, userId, event);
    }

    const request = await this.requestRepository.create({
      userId,
      eventId: createRequestDto.eventId,
      status: RequestStatus.APPROVED,
      approvedAt: new Date(),
    });

    this.logger.log(`Created and approved request ${request.requestId}`);
    return request;
  }

  async findRequestById(requestId: string): Promise<Request | null> {
    return this.requestRepository.findById(requestId);
  }

  async grantReward(reward: Reward, userId: string, event: Event) {
    const amount = reward.rewardPoint;

    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new RpcException(new InternalServerException('유저 정보 없음'));
      }

      const newBalance = (user!.balance || 0) + amount;
      await this.userRepository.updateBalance(userId, newBalance);

      await this.pointTransactionRepository.create({
        userId: user._id as Types.ObjectId,
        amount,
        type: PointTransactionType.EVENT_REWARD,
        eventId: event._id as Types.ObjectId,
        balanceAfter: newBalance,
        description: `[이벤트:${event.title}] 보상 지급`,
      });
    } catch (err) {
      this.logger.error('포인트 지급 실패', err);
      throw new RpcException(new InternalServerException('포인트 지급 실패'));
    }
  }
}
