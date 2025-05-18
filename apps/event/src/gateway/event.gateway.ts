import { BadRequestException, Controller, HttpStatus, NotFoundException } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { EventService } from '@app/common/services/event.service';
import { BaseResponseDto, UserInfo } from '@app/common/dto';
import { Event, Reward } from '@app/common/schemas';
import { CreateEventDto, RewardDto } from '@app/common/dto/event';
import { User } from '@app/common/decorators';

interface ProxyPayload {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Record<string, unknown>;
}

@Controller()
export class EventGateway {
  constructor(
    private readonly logger: CustomLoggerService,
    private readonly eventService: EventService,
  ) {
    this.logger.setContext('EventGateway');
  }

  @MessagePattern({ cmd: 'proxy' })
  async handleProxyRequest(data: {
    path: string;
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<unknown>> {
    this.logger.log(`Received proxy request for path: ${data.path}, method: ${data.method}`);

    const eventIdMatch = data.path.match(/^events\/([^/]+)$/);
    const eventRewardsMatch = data.path.match(/^events\/([^/]+)\/rewards$/);

    if (data.path === '' || data.path === 'events') {
      return this.handleEvents(data);
    } else if (eventIdMatch) {
      return this.handleEventById({ ...data, eventId: eventIdMatch[1] });
    } else if (data.path === 'events/rewards' || eventRewardsMatch) {
      return this.handleEventRewards(data);
    }

    this.logger.warn(`Unknown path requested in Event service: ${data.path}`);
    throw new RpcException(new NotFoundException(`Cannot ${data.method} /${data.path}`));
  }

  private async handleEvents(data: {
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<Event | Event[]>> {
    switch (data.method) {
      case 'POST': {
        const createEventDto = data.body.body as CreateEventDto;
        const userId = data.body.headers['user-id'] as string;

        if (!userId) {
          throw new RpcException(new BadRequestException('User ID is required'));
        }

        const event = await this.eventService.createEvent(createEventDto, userId);

        return {
          statusCode: HttpStatus.CREATED,
          message: '이벤트가 성공적으로 생성되었습니다.',
          data: event,
          timestamp: new Date().toISOString(),
        };
      }
      case 'GET': {
        console.log('Fetching all events');
        const events = await this.eventService.findAllEvents();
        return {
          statusCode: HttpStatus.OK,
          message: '이벤트 목록을 성공적으로 조회했습니다.',
          data: events,
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
    method: string;
    body: ProxyPayload;
    eventId: string;
  }): Promise<BaseResponseDto<Event>> {
    if (data.method === 'GET') {
      const event = await this.eventService.findEventById(data.eventId);

      if (!event) {
        throw new RpcException(new NotFoundException('Event not found'));
      }

      return {
        statusCode: HttpStatus.OK,
        message: '이벤트를 성공적으로 조회했습니다.',
        data: event,
        timestamp: new Date().toISOString(),
      };
    }

    throw new RpcException(
      new BadRequestException(`Method ${data.method} not supported for event by id`),
    );
  }

  private async handleEventRewards(data: {
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<Event | Event[] | Reward[]>> {
    const { eventId } = data.body.params as { eventId: string };

    switch (data.method) {
      case 'POST': {
        const rewardDto = data.body.body as RewardDto;

        if (!eventId) {
          throw new RpcException(new BadRequestException('Event ID is required'));
        }

        const event = await this.eventService.addEventReward(eventId, rewardDto);
        if (!event) {
          throw new RpcException(new NotFoundException('Event not found'));
        }

        return {
          statusCode: HttpStatus.OK,
          message: '이벤트 보상이 성공적으로 추가되었습니다.',
          data: event,
          timestamp: new Date().toISOString(),
        };
      }
      case 'GET': {
        const event = await this.eventService.findEventById(eventId);

        if (!event) {
          throw new RpcException(new NotFoundException('Event not found'));
        }

        return {
          statusCode: HttpStatus.OK,
          message: '이벤트 보상 목록을 성공적으로 조회했습니다.',
          data: event.rewards,
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
