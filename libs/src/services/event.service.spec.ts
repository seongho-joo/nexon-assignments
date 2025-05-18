import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { EventRepository } from '@app/common/repositories/event.repository';
import { CustomLoggerService } from '@app/common/logger';
import { CreateEventDto } from '@app/common/dto/event/create-event.dto';
import { RewardDto } from '@app/common/dto/event/reward.dto';
import { Event, EventStatus, RewardConditionType } from '@app/common/schemas';
import { RpcException } from '@nestjs/microservices';
import { Document } from 'mongoose';

describe('EventService', () => {
  let service: EventService;
  let repository: EventRepository;
  let logger: CustomLoggerService;

  const mockEvent = {
    eventId: 'test-event-id',
    title: '테스트 이벤트',
    description: '테스트 이벤트입니다.',
    startDate: new Date('2024-03-20'),
    endDate: new Date('2024-04-20'),
    status: EventStatus.DRAFT,
    rewards: [],
    createdBy: 'test-user-id',
    isActive: true,
  } as unknown as Event & Document;

  const mockCreateEventDto: CreateEventDto = {
    title: '테스트 이벤트',
    description: '테스트 이벤트입니다.',
    startDate: new Date('2024-03-20'),
    endDate: new Date('2024-04-20'),
    rewards: [],
  };

  const mockRewardDto: RewardDto = {
    name: '테스트 보상',
    description: '테스트 보상입니다.',
    rewardPoint: 1000,
    condition: {
      type: RewardConditionType.LOGIN,
      targetValue: 1,
      description: '로그인 시 지급',
      additionalParams: {},
      toSchema: () => ({
        type: RewardConditionType.LOGIN,
        targetValue: 1,
        description: '로그인 시 지급',
        additionalParams: {},
      }),
    },
    toSchema: () => ({
      name: '테스트 보상',
      description: '테스트 보상입니다.',
      rewardPoint: 1000,
      condition: {
        type: RewardConditionType.LOGIN,
        targetValue: 1,
        description: '로그인 시 지급',
        additionalParams: {},
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: EventRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            findAll: jest.fn(),
            findByStatus: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    repository = module.get<EventRepository>(EventRepository);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      jest.spyOn(repository, 'create').mockResolvedValue(mockEvent);

      const result = await service.createEvent(mockCreateEventDto, 'test-user-id');

      expect(repository.create).toHaveBeenCalledWith({
        ...mockCreateEventDto,
        createdBy: 'test-user-id',
        status: EventStatus.DRAFT,
        isActive: true,
      });
      expect(result).toBe(mockEvent);
    });

    it('should throw BadRequestException when start date is after end date', async () => {
      const invalidDto = {
        ...mockCreateEventDto,
        startDate: new Date('2024-04-21'),
        endDate: new Date('2024-04-20'),
      };

      await expect(service.createEvent(invalidDto, 'test-user-id')).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('addEventReward', () => {
    it('should add a reward to an event successfully', async () => {
      const eventWithReward = {
        ...mockEvent,
        rewards: [mockRewardDto],
      } as unknown as Event & Document;

      jest.spyOn(repository, 'findById').mockResolvedValue(mockEvent);
      jest.spyOn(repository, 'update').mockResolvedValue(eventWithReward);

      const result = await service.addEventReward('test-event-id', mockRewardDto);

      expect(repository.findById).toHaveBeenCalledWith('test-event-id');
      expect(repository.update).toHaveBeenCalledWith('test-event-id', {
        rewards: [mockRewardDto.toSchema()],
      });
      expect(result).toBe(eventWithReward);
    });

    it('should throw BadRequestException when event is not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.addEventReward('test-event-id', mockRewardDto)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw BadRequestException when event is ended', async () => {
      const endedEvent = {
        ...mockEvent,
        status: EventStatus.ENDED,
      } as unknown as Event & Document;

      jest.spyOn(repository, 'findById').mockResolvedValue(endedEvent);

      await expect(service.addEventReward('test-event-id', mockRewardDto)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw RpcException when update fails', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockEvent);
      jest.spyOn(repository, 'update').mockResolvedValue(null);

      await expect(service.addEventReward('test-event-id', mockRewardDto)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('findAllEvents', () => {
    it('should return all active events', async () => {
      const mockEvents = [
        mockEvent,
        { ...mockEvent, eventId: 'test-event-id-2' } as unknown as Event & Document,
      ];
      jest.spyOn(repository, 'findAll').mockResolvedValue(mockEvents);

      const result = await service.findAllEvents();

      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });
  });

  describe('findEventById', () => {
    it('should return event when found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockEvent);

      const result = await service.findEventById('test-event-id');

      expect(repository.findById).toHaveBeenCalledWith('test-event-id');
      expect(result).toBe(mockEvent);
    });

    it('should return null when event not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const result = await service.findEventById('non-existent-id');

      expect(repository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findEventsByStatus', () => {
    it('should return events with specified status', async () => {
      const mockEvents = [
        mockEvent,
        { ...mockEvent, eventId: 'test-event-id-2' } as unknown as Event & Document,
      ];
      jest.spyOn(repository, 'findByStatus').mockResolvedValue(mockEvents);

      const result = await service.findEventsByStatus(EventStatus.DRAFT);

      expect(repository.findByStatus).toHaveBeenCalledWith(EventStatus.DRAFT);
      expect(result).toEqual(mockEvents);
    });

    it('should return empty array when no events found with status', async () => {
      jest.spyOn(repository, 'findByStatus').mockResolvedValue([]);

      const result = await service.findEventsByStatus(EventStatus.ENDED);

      expect(repository.findByStatus).toHaveBeenCalledWith(EventStatus.ENDED);
      expect(result).toEqual([]);
    });
  });
}); 