import { BadRequestException, Controller, HttpStatus, NotFoundException } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { EventService } from '@app/common/services/event.service';
import { BaseResponseDto, UserInfo } from '@app/common/dto';
import { Event } from '@app/common/schemas';
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

    switch (data.path) {
      case '':
      case 'events':
        return this.handleEvents(data);
      case 'events/rewards':
        return this.handleEventRewards(data);
      default:
        this.logger.warn(`Unknown path requested in Event service: ${data.path}`);
        throw new NotFoundException(`Cannot ${data.method} /${data.path}`);
    }
  }

  private async handleEvents(data: {
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<Event>> {
    if (data.method === 'POST') {
      console.log({ data: JSON.stringify(data, null, 2) });
      const createEventDto = data.body.body as CreateEventDto;
      console.log('createEventDto', createEventDto);
      const userId = data.body.headers['user-id'] as string;
      console.log('userId', userId);

      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const event = await this.eventService.createEvent(createEventDto, userId);

      return {
        statusCode: HttpStatus.CREATED,
        message: '이벤트가 성공적으로 생성되었습니다.',
        data: event,
        timestamp: new Date().toISOString(),
      };
    }

    throw new BadRequestException(`Method ${data.method} not supported for events`);
  }

  private async handleEventRewards(data: {
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<Event>> {
    if (data.method === 'POST') {
      const { eventId } = data.body.params as { eventId: string };
      const rewardDto = data.body.body as RewardDto;

      if (!eventId) {
        throw new BadRequestException('Event ID is required');
      }

      const event = await this.eventService.addEventReward(eventId, rewardDto);

      return {
        statusCode: HttpStatus.OK,
        message: '이벤트 보상이 성공적으로 추가되었습니다.',
        data: event,
        timestamp: new Date().toISOString(),
      };
    }

    throw new BadRequestException(`Method ${data.method} not supported for event rewards`);
  }
}
