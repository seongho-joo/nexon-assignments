import { Test, TestingModule } from '@nestjs/testing';
import { EventGateway } from './event.gateway';
import { EventService } from '@app/common/services/event.service';
import { CustomLoggerService } from '@app/common/logger';
import { Event, EventStatus, RewardConditionType } from '@app/common/schemas';
import { CreateEventDto } from '@app/common/dto/event/create-event.dto';
import { RewardDto } from '@app/common/dto/event/reward.dto';
import { Document } from 'mongoose';
import { RpcException } from '@nestjs/microservices';

interface ProxyPayload {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Record<string, unknown>;
}

describe('EventGateway', () => {
  let gateway: EventGateway;
  let service: EventService;
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
        EventGateway,
        {
          provide: EventService,
          useValue: {
            createEvent: jest.fn(),
            addEventReward: jest.fn(),
            findAllEvents: jest.fn(),
            findEventById: jest.fn(),
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
    service = module.get<EventService>(EventService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  describe('handleProxyRequest', () => {
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

      const result = await gateway.handleProxyRequest(mockRequest);

      expect(service.createEvent).toHaveBeenCalledWith(mockCreateEventDto, 'test-user-id');
      expect(result).toEqual({
        statusCode: 201,
        message: '이벤트가 성공적으로 생성되었습니다.',
        data: mockEvent,
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

      const mockEvents = [mockEvent, { ...mockEvent, eventId: 'test-event-id-2' }] as unknown as Event[];
      jest.spyOn(service, 'findAllEvents').mockResolvedValue(mockEvents);

      const result = await gateway.handleProxyRequest(mockRequest);

      expect(service.findAllEvents).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: '이벤트 목록을 성공적으로 조회했습니다.',
        data: mockEvents,
        timestamp: expect.any(String),
      });
    });

    it('should handle get event by id request', async () => {
      const mockRequest = {
        path: `events/${mockEvent.eventId}`,
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: { eventId: mockEvent.eventId },
          headers: {},
        } as ProxyPayload,
      };

      jest.spyOn(service, 'findEventById').mockResolvedValue(mockEvent);

      const result = await gateway.handleProxyRequest(mockRequest);

      expect(service.findEventById).toHaveBeenCalledWith(mockEvent.eventId);
      expect(result).toEqual({
        statusCode: 200,
        message: '이벤트를 성공적으로 조회했습니다.',
        data: mockEvent,
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

      await expect(gateway.handleProxyRequest(mockRequest)).rejects.toThrow(RpcException);
    });

    it('should handle get event rewards request', async () => {
      const mockRequest = {
        path: `events/${mockEvent.eventId}/rewards`,
        method: 'GET',
        body: {
          body: {},
          query: {},
          params: { eventId: mockEvent.eventId },
          headers: {},
        } as ProxyPayload,
      };

      jest.spyOn(service, 'findEventById').mockResolvedValue(mockEvent);

      const result = await gateway.handleProxyRequest(mockRequest);

      expect(service.findEventById).toHaveBeenCalledWith(mockEvent.eventId);
      expect(result).toEqual({
        statusCode: 200,
        message: '이벤트 보상 목록을 성공적으로 조회했습니다.',
        data: mockEvent.rewards,
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

      await expect(gateway.handleProxyRequest(mockRequest)).rejects.toThrow(RpcException);
    });

    it('should handle event reward addition request', async () => {
      const mockRequest = {
        path: `events/${mockEvent.eventId}/rewards`,
        method: 'POST',
        body: {
          body: mockRewardDto,
          query: {},
          params: { eventId: mockEvent.eventId },
          headers: {},
        } as ProxyPayload,
      };

      const eventWithReward = {
        ...mockEvent,
        rewards: [mockRewardDto.toSchema()],
      } as unknown as Event & Document;

      jest.spyOn(service, 'addEventReward').mockResolvedValue(eventWithReward);

      const result = await gateway.handleProxyRequest(mockRequest);

      expect(service.addEventReward).toHaveBeenCalledWith(mockEvent.eventId, mockRewardDto);
      expect(result).toEqual({
        statusCode: 200,
        message: '이벤트 보상이 성공적으로 추가되었습니다.',
        data: eventWithReward,
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

      await expect(gateway.handleProxyRequest(mockRequest)).rejects.toThrow(
        'User ID is required',
      );
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

      await expect(gateway.handleProxyRequest(mockRequest)).rejects.toThrow(
        'Cannot GET /unknown',
      );
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

      await expect(gateway.handleProxyRequest(mockRequest)).rejects.toThrow(
        'Method PUT not supported for events',
      );
    });
  });
}); 