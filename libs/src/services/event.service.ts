import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger';
import { EventRepository } from '@app/common/repositories/event.repository';
import { CreateEventDto } from '@app/common/dto/event/create-event.dto';
import { RewardDto } from '@app/common/dto/event/reward.dto';
import { Event, EventStatus } from '@app/common/schemas';
import { BadRequestException } from '@app/common/exceptions';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('EventService');
  }

  async createEvent(createEventDto: CreateEventDto, userId: string): Promise<Event> {
    this.logger.log(`Creating event: ${createEventDto.title}`);

    if (new Date(createEventDto.startDate) > new Date(createEventDto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const event = await this.eventRepository.create({
      ...createEventDto,
      createdBy: userId,
      status: EventStatus.DRAFT,
      isActive: true,
    });

    this.logger.log(`Created event with ID: ${event.eventId}`);
    return event;
  }

  async addEventReward(eventId: string, rewardDto: RewardDto): Promise<Event> {
    this.logger.log(`Adding reward to event ${eventId}`);

    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    if (event.status === EventStatus.ENDED || event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot add rewards to ended or cancelled events');
    }

    event.rewards.push(rewardDto);
    const updatedEvent = await this.eventRepository.update(eventId, { rewards: event.rewards });
    if (!updatedEvent) {
      throw new RpcException(new BadRequestException('Failed to update event with new reward'));
    }

    this.logger.log(`Added reward to event ${eventId}`);
    return updatedEvent;
  }
}
