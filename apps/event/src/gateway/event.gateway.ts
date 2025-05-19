import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { EventService } from '@app/common/services/event.service';
import { BaseResponseDto, GatewayCommandEnum } from '@app/common/dto';
import {
  CreateEventDto,
  RewardDto,
  EventResponseDto,
  EventListResponseDto,
  EventRewardsResponseDto,
  RewardConditionDto,
} from '@app/common/dto/event';
import { BadRequestException, NotFoundException } from '@app/common/exceptions';
import { transformToDto, transformToPaginatedDto } from '@app/common/utils/dto.helper';

interface ProxyPayload {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Record<string, unknown>;
}

@Controller()
export class EventGateway {
  constructor(
    private readonly eventService: EventService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('EventGateway');
  }

  @MessagePattern({ cmd: GatewayCommandEnum.EVENT })
  async handleRequest(data: {
    path: string;
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<unknown>> {
    // /api 접두사 제거
    const path = data.path.replace(/^api\//, '');
    this.logger.log(`Received proxy request for path: ${path}, method: ${data.method}`);

    // GET /events or POST /events
    if (path === 'events') {
      return this.handleEvents({ ...data, path });
    }

    // GET /events/:eventId/rewards or POST /events/:eventId/rewards
    const rewardsMatch = path.match(/^events\/([^/]+)\/rewards$/);
    if (rewardsMatch) {
      const eventId = rewardsMatch[1];
      return this.handleEventRewards({ ...data, path, eventId });
    }

    // GET /events/:eventId
    const eventMatch = path.match(/^events\/([^/]+)$/);
    if (eventMatch && data.method === 'GET') {
      const eventId = eventMatch[1];
      return this.handleEventById({ ...data, path, eventId });
    }

    throw new RpcException(new NotFoundException(`Cannot ${data.method} /${path}`));
  }

  private async handleEvents(data: {
    path: string;
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<EventResponseDto | EventListResponseDto>> {
    switch (data.method) {
      case 'POST': {
        const createEventDto = data.body.body as CreateEventDto;
        const userId = data.body.headers['user-id'] as string;

        if (!userId) {
          throw new RpcException(new BadRequestException('User ID is required'));
        }

        const event = await this.eventService.createEvent(createEventDto, userId);
        const response = transformToDto(EventResponseDto, event);

        return {
          statusCode: HttpStatus.CREATED,
          message: '이벤트가 성공적으로 생성되었습니다.',
          data: response,
          timestamp: new Date().toISOString(),
        };
      }
      case 'GET': {
        this.logger.log('Fetching all events');
        const events = await this.eventService.findAllEvents();
        const response = transformToDto(EventListResponseDto, { events });

        return {
          statusCode: HttpStatus.OK,
          message: '이벤트 목록을 성공적으로 조회했습니다.',
          data: response,
          timestamp: new Date().toISOString(),
        };
      }
      default:
        throw new RpcException(
          new BadRequestException(`Method ${data.method} not supported for events`),
        );
    }
  }

  private async handleEventById(data: {
    path: string;
    method: string;
    body: ProxyPayload;
    eventId: string;
  }): Promise<BaseResponseDto<EventResponseDto>> {
    if (data.method === 'GET') {
      const event = await this.eventService.findEventById(data.eventId);

      if (!event) {
        throw new RpcException(new NotFoundException('Event not found'));
      }

      const response = transformToDto(EventResponseDto, event);

      return {
        statusCode: HttpStatus.OK,
        message: '이벤트를 성공적으로 조회했습니다.',
        data: response,
        timestamp: new Date().toISOString(),
      };
    }

    throw new RpcException(
      new BadRequestException(`Method ${data.method} not supported for event by id`),
    );
  }

  private async handleEventRewards(data: {
    path: string;
    method: string;
    body: ProxyPayload;
    eventId: string;
  }): Promise<BaseResponseDto<EventRewardsResponseDto>> {
    switch (data.method) {
      case 'POST': {
        const rewardDto = Object.assign(new RewardDto(), data.body.body as RewardDto);
        rewardDto.condition = Object.assign(new RewardConditionDto(), rewardDto.condition);

        if (!data.eventId) {
          throw new RpcException(new BadRequestException('Event ID is required'));
        }

        const event = await this.eventService.addEventReward(data.eventId, rewardDto);
        if (!event) {
          throw new RpcException(new NotFoundException('Event not found'));
        }

        const response = transformToDto(EventRewardsResponseDto, {
          _id: event._id,
          rewards: event.rewards,
        });

        return {
          statusCode: HttpStatus.OK,
          message: '이벤트 보상이 성공적으로 추가되었습니다.',
          data: response,
          timestamp: new Date().toISOString(),
        };
      }
      case 'GET': {
        const event = await this.eventService.findEventById(data.eventId);

        if (!event) {
          throw new RpcException(new NotFoundException('Event not found'));
        }

        const response = transformToDto(EventRewardsResponseDto, {
          _id: event._id,
          rewards: event.rewards,
        });

        return {
          statusCode: HttpStatus.OK,
          message: '이벤트 보상 목록을 성공적으로 조회했습니다.',
          data: response,
          timestamp: new Date().toISOString(),
        };
      }
      default:
        throw new RpcException(
          new BadRequestException(`Method ${data.method} not supported for event rewards`),
        );
    }
  }
}
