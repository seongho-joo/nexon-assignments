import { Test, TestingModule } from '@nestjs/testing';
import { EventGateway } from './event.gateway';
import { EventService } from '@app/common/services/event.service';
import { CustomLoggerService } from '@app/common/logger';
import { Event, EventStatus, RewardConditionType } from '@app/common/schemas';
import { CreateEventDto } from '@app/common/dto/event/create-event.dto';
import { RewardDto } from '@app/common/dto/event/reward.dto';
import { Document, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';

interface ProxyPayload {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Record<string, unknown>;
}

// Extend Event type to include timestamps
interface EventWithTimestamps extends Event {
  _id: Types.ObjectId;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: EventStatus;
  rewards: any[];
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

describe('EventGateway', () => {
  let gateway: EventGateway;
  let service: jest.Mocked<EventService>;
  let logger: CustomLoggerService;

  const mockEvent = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    title: '테스트 이벤트',
    description: '테스트 이벤트입니다.',
    startDate: new Date('2024-03-20'),
    endDate: new Date('2024-04-20'),
    status: EventStatus.DRAFT,
    rewards: [],
    createdBy: 'test-user-id',
    isActive: true,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
    $assertPopulated: () => {},
    $clearModifiedPaths: () => {},
    $clone: () => mockEvent,
    $getAllSubdocs: () => [],
    $ignore: () => {},
    $inc: () => mockEvent,
    $isDefault: () => false,
    $isDeleted: () => false,
    $isEmpty: () => false,
    $isValid: () => true,
    $locals: {},
    $markValid: () => {},
    $model: () => ({}),
    $op: null,
    $parent: () => null,
    $session: () => null,
    $set: () => mockEvent,
    $where: {},
    baseModelName: null,
    collection: {} as any,
    db: {} as any,
    delete: () => Promise.resolve(mockEvent),
    deleteOne: () => Promise.resolve(mockEvent),
    depopulate: () => mockEvent,
    directModifiedPaths: () => [],
    equals: () => true,
    errors: {},
    get: () => {},
    getChanges: () => ({}),
    increment: () => mockEvent,
    init: () => mockEvent,
    invalidate: () => {},
    isDirectModified: () => false,
    isDirectSelected: () => false,
    isInit: () => false,
    isModified: () => false,
    isNew: false,
    isSelected: () => false,
    markModified: () => {},
    modifiedPaths: () => [],
    modelName: '',
    overwrite: () => Promise.resolve(mockEvent),
    populate: () => Promise.resolve(mockEvent),
    populated: () => '',
    remove: () => Promise.resolve(mockEvent),
    replaceOne: () => Promise.resolve(mockEvent),
    save: () => Promise.resolve(mockEvent),
    schema: {} as any,
    set: () => {},
    toJSON: () => ({}),
    toObject: () => ({}),
    unmarkModified: () => {},
    update: () => Promise.resolve(mockEvent),
    updateOne: () => Promise.resolve(mockEvent),
    validate: () => Promise.resolve(),
    validateSync: () => undefined,
  } as unknown as EventWithTimestamps & Document;

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
      rewardPoint: 1000,
      description: '테스트 보상입니다.',
      condition: {
        type: RewardConditionType.LOGIN,
        targetValue: 1,
        description: '로그인 시 지급',
        additionalParams: {},
      },
    }),
  };

  const mockEventWithReward = {
    ...mockEvent,
    rewards: [
      {
        name: '테스트 보상',
        description: '테스트 보상입니다.',
        rewardPoint: 1000,
        condition: {
          type: RewardConditionType.LOGIN,
          targetValue: 1,
          description: '로그인 시 지급',
          additionalParams: {},
        },
      },
    ],
  } as EventWithTimestamps;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventGateway,
        {
          provide: EventService,
          useValue: {
            createEvent: jest.fn(),
            addEventReward: jest.fn(),
            findAllEvents: jest.fn(),
            findEventById: jest.fn(),
            findEventsByStatus: jest.fn(),
            updateEvent: jest.fn(),
            deleteEvent: jest.fn(),
            findEventsByUserId: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<EventGateway>(EventGateway);
    service = module.get(EventService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  describe('handleRequest', () => {
    it('should handle event creation request', async () => {
      const mockRequest = {
        path: 'events',
        method: 'POST',
        body: {
          body: mockCreateEventDto,
          query: {},
          params: {},
          headers: { 'user-id': 'test-user-id' },
        } as ProxyPayload,
      };

      jest.spyOn(service, 'createEvent').mockResolvedValue(mockEvent);

      const result = await gateway.handleRequest(mockRequest);

      expect(service.createEvent).toHaveBeenCalledWith(mockCreateEventDto, 'test-user-id');
      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: '이벤트가 성공적으로 생성되었습니다.',
        data: {
          eventId: mockEvent._id.toString(),
          title: mockEvent.title,
          description: mockEvent.description,
          startDate: mockEvent.startDate,
          endDate: mockEvent.endDate,
          status: mockEvent.status,
          rewards: mockEvent.rewards,
          createdBy: mockEvent.createdBy,
          isActive: mockEvent.isActive,
          createdAt: mockEvent.createdAt,
          updatedAt: mockEvent.updatedAt,
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle get all events request', async () => {
      const mockRequest = {
        path: 'events',
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: {},
          headers: {},
        } as ProxyPayload,
      };

      const mockEvents = [
        mockEvent,
        { ...mockEvent, _id: new Types.ObjectId('507f1f77bcf86cd799439012') },
      ] as unknown as Event[];
      jest.spyOn(service, 'findAllEvents').mockResolvedValue(mockEvents);

      const result = await gateway.handleRequest(mockRequest);

      expect(service.findAllEvents).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '이벤트 목록을 성공적으로 조회했습니다.',
        data: {
          events: [
            {
              eventId: mockEvent._id.toString(),
              title: mockEvent.title,
              description: mockEvent.description,
              startDate: mockEvent.startDate,
              endDate: mockEvent.endDate,
              status: mockEvent.status,
              rewards: mockEvent.rewards,
              createdBy: mockEvent.createdBy,
              isActive: mockEvent.isActive,
              createdAt: mockEvent.createdAt,
              updatedAt: mockEvent.updatedAt,
            },
            {
              eventId: new Types.ObjectId('507f1f77bcf86cd799439012').toString(),
              title: mockEvent.title,
              description: mockEvent.description,
              startDate: mockEvent.startDate,
              endDate: mockEvent.endDate,
              status: mockEvent.status,
              rewards: mockEvent.rewards,
              createdBy: mockEvent.createdBy,
              isActive: mockEvent.isActive,
              createdAt: mockEvent.createdAt,
              updatedAt: mockEvent.updatedAt,
            },
          ],
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle get event by id request', async () => {
      const mockRequest = {
        path: `events/${mockEvent._id}`,
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: { eventId: mockEvent._id },
          headers: {},
        } as ProxyPayload,
      };

      jest.spyOn(service, 'findEventById').mockResolvedValue(mockEvent);

      const result = await gateway.handleRequest(mockRequest);

      expect(service.findEventById).toHaveBeenCalledWith(mockEvent._id.toString());
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '이벤트를 성공적으로 조회했습니다.',
        data: {
          eventId: mockEvent._id.toString(),
          title: mockEvent.title,
          description: mockEvent.description,
          startDate: mockEvent.startDate,
          endDate: mockEvent.endDate,
          status: mockEvent.status,
          rewards: mockEvent.rewards,
          createdBy: mockEvent.createdBy,
          isActive: mockEvent.isActive,
          createdAt: mockEvent.createdAt,
          updatedAt: mockEvent.updatedAt,
        },
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException when event not found by id', async () => {
      const mockRequest = {
        path: 'events/non-existent-id',
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: { eventId: 'non-existent-id' },
          headers: {},
        } as ProxyPayload,
      };

      jest.spyOn(service, 'findEventById').mockResolvedValue(null);

      await expect(gateway.handleRequest(mockRequest)).rejects.toThrow(RpcException);
    });

    it('should handle get event rewards request', async () => {
      const mockRequest = {
        path: `events/${mockEvent._id}/rewards`,
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: { eventId: mockEvent._id },
          headers: {},
        } as ProxyPayload,
      };

      jest.spyOn(service, 'findEventById').mockResolvedValue(mockEvent);

      const result = await gateway.handleRequest(mockRequest);

      expect(service.findEventById).toHaveBeenCalledWith(mockEvent._id.toString());
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '이벤트 보상 목록을 성공적으로 조회했습니다.',
        data: {
          eventId: mockEvent._id.toString(),
          rewards: mockEvent.rewards,
        },
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException when getting rewards of non-existent event', async () => {
      const mockRequest = {
        path: 'events/non-existent-id/rewards',
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: { eventId: 'non-existent-id' },
          headers: {},
        } as ProxyPayload,
      };

      jest.spyOn(service, 'findEventById').mockResolvedValue(null);

      await expect(gateway.handleRequest(mockRequest)).rejects.toThrow(RpcException);
    });

    it('should handle event reward addition request', async () => {
      const mockRequest = {
        path: `events/${mockEvent._id}/rewards`,
        method: 'POST',
        body: {
          body: mockRewardDto,
          query: {},
          params: { eventId: mockEvent._id },
          headers: {},
        } as ProxyPayload,
      };

      jest.spyOn(service, 'addEventReward').mockResolvedValue(mockEventWithReward);

      const result = await gateway.handleRequest(mockRequest);

      expect(service.addEventReward).toHaveBeenCalledWith(mockEvent._id.toString(), mockRewardDto);
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '이벤트 보상이 성공적으로 추가되었습니다.',
        data: {
          eventId: mockEventWithReward._id.toString(),
          rewards: [
            {
              name: mockRewardDto.name,
              description: mockRewardDto.description,
              rewardPoint: mockRewardDto.rewardPoint,
              condition: {
                type: mockRewardDto.condition.type,
                targetValue: mockRewardDto.condition.targetValue,
                description: mockRewardDto.condition.description,
                additionalParams: mockRewardDto.condition.additionalParams,
              },
            },
          ],
        },
        timestamp: expect.any(String),
      });
    });

    it('should throw BadRequestException when user-id is missing', async () => {
      const mockRequest = {
        path: 'events',
        method: 'POST',
        body: {
          body: mockCreateEventDto,
          query: {},
          params: {},
          headers: {},
        } as ProxyPayload,
      };

      await expect(gateway.handleRequest(mockRequest)).rejects.toThrow('User ID is required');
    });

    it('should throw NotFoundException for unknown path', async () => {
      const mockRequest = {
        path: 'unknown',
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: {},
          headers: {},
        } as ProxyPayload,
      };

      await expect(gateway.handleRequest(mockRequest)).rejects.toThrow('Cannot GET /unknown');
    });

    it('should throw BadRequestException for unsupported method', async () => {
      const mockRequest = {
        path: 'events',
        method: 'PUT',
        body: {
          body: {},
          query: {},
          params: {},
          headers: {},
        } as ProxyPayload,
      };

      await expect(gateway.handleRequest(mockRequest)).rejects.toThrow(
        'Method PUT not supported for events',
      );
    });
  });
});
