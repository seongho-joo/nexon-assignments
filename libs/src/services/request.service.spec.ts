import { Test, TestingModule } from '@nestjs/testing';
import { RequestService } from './request.service';
import { RequestRepository } from '@app/common/repositories/request.repository';
import { EventService } from './event.service';
import { RewardConditionValidatorService } from '@app/common/services/reward-condition-validator.service';
import { PointTransactionRepository } from '@app/common/repositories/point-transaction.repository';
import { UserRepository } from '@app/common/repositories/user.repository';
import { CustomLoggerService } from '@app/common/logger';
import { RpcException } from '@nestjs/microservices';
import {
  Event,
  PointTransactionType,
  RequestStatus,
  Reward,
  User,
  RewardConditionType,
  Request,
} from '@app/common/schemas';
import { Types } from 'mongoose';
import { CreateRequestDto } from '@app/common/dto/request';

describe('RequestService', () => {
  let service: RequestService;
  let requestRepository: jest.Mocked<RequestRepository>;
  let eventService: jest.Mocked<EventService>;
  let rewardConditionValidator: jest.Mocked<RewardConditionValidatorService>;
  let pointTransactionRepository: jest.Mocked<PointTransactionRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let logger: jest.Mocked<CustomLoggerService>;

  const mockEvent: Partial<Event> = {
    eventId: 'event123',
    title: 'Test Event',
    description: 'Test Description',
    rewards: [
      {
        rewardPoint: 100,
        name: 'Play Time Reward',
        description: 'Reward for playing 1 hour',
        condition: {
          type: RewardConditionType.PLAY_TIME,
          targetValue: 3600,
          description: 'Play for 1 hour',
          additionalParams: {},
        },
      } as Reward,
    ],
  };

  const mockUser: Partial<User> = {
    userId: 'user123',
    username: 'testuser',
    balance: 0,
  };

  const mockReward: Reward = mockEvent.rewards![0] as Reward;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
        {
          provide: RequestRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByUserIdAndEventId: jest.fn(),
            findAll: jest.fn(),
            count: jest.fn(),
            findByUserId: jest.fn(),
            countByUserId: jest.fn(),
          },
        },
        {
          provide: EventService,
          useValue: {
            findEventById: jest.fn(),
          },
        },
        {
          provide: RewardConditionValidatorService,
          useValue: {
            validateCondition: jest.fn(),
          },
        },
        {
          provide: PointTransactionRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            updateBalance: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RequestService>(RequestService);
    requestRepository = module.get(RequestRepository);
    eventService = module.get(EventService);
    rewardConditionValidator = module.get(RewardConditionValidatorService);
    pointTransactionRepository = module.get(PointTransactionRepository);
    userRepository = module.get(UserRepository);
    logger = module.get(CustomLoggerService);
  });

  describe('createRequest', () => {
    const createRequestDto: CreateRequestDto = {
      eventId: 'event123',
    };

    beforeEach(() => {
      eventService.findEventById.mockResolvedValue(mockEvent as Event);
      rewardConditionValidator.validateCondition.mockResolvedValue({ isValid: true });
      userRepository.findById.mockResolvedValue(mockUser as User);
      requestRepository.create.mockResolvedValue({
        requestId: 'request123',
        userId: 'user123',
        eventId: 'event123',
        status: RequestStatus.APPROVED,
      } as any);
      pointTransactionRepository.create.mockResolvedValue({} as any);
    });

    it('should create a request and grant total reward points successfully', async () => {
      const result = await service.createRequest(createRequestDto, 'user123');

      expect(eventService.findEventById).toHaveBeenCalledWith('event123');
      expect(rewardConditionValidator.validateCondition).toHaveBeenCalledWith(
        mockEvent.rewards![0].condition,
        'user123',
      );
      expect(userRepository.updateBalance).toHaveBeenCalledWith(
        'user123',
        mockUser.balance! + mockEvent.rewards![0].rewardPoint,
      );
      expect(pointTransactionRepository.create).toHaveBeenCalledWith({
        userId: mockUser._id,
        amount: mockEvent.rewards![0].rewardPoint,
        type: PointTransactionType.EVENT_REWARD,
        eventId: mockEvent._id,
        balanceAfter: mockUser.balance! + mockEvent.rewards![0].rewardPoint,
        description: `[이벤트:${mockEvent.title}] 보상 지급`,
      });
      expect(requestRepository.create).toHaveBeenCalledWith({
        userId: 'user123',
        eventId: 'event123',
        status: RequestStatus.APPROVED,
        approvedAt: expect.any(Date),
      });
      expect(result.requestId).toBe('request123');
    });

    it('should throw error if event not found', async () => {
      eventService.findEventById.mockResolvedValue(null);

      await expect(service.createRequest(createRequestDto, 'user123')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error if event has no rewards', async () => {
      eventService.findEventById.mockResolvedValue({ ...mockEvent, rewards: [] } as Event);

      await expect(service.createRequest(createRequestDto, 'user123')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error if reward already requested', async () => {
      requestRepository.findByUserIdAndEventId.mockResolvedValue({} as any);

      await expect(service.createRequest(createRequestDto, 'user123')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error if reward condition not met', async () => {
      rewardConditionValidator.validateCondition.mockResolvedValue({
        isValid: false,
        reason: '플레이 시간 부족',
      });

      await expect(service.createRequest(createRequestDto, 'user123')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error if user not found during reward granting', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.createRequest(createRequestDto, 'user123')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error if point transaction fails', async () => {
      pointTransactionRepository.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.createRequest(createRequestDto, 'user123')).rejects.toThrow(
        RpcException,
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle user with no initial balance', async () => {
      const userWithNoBalance = { ...mockUser, balance: 0 };
      userRepository.findById.mockResolvedValue(userWithNoBalance as User);

      await service.createRequest(createRequestDto, 'user123');

      expect(userRepository.updateBalance).toHaveBeenCalledWith(
        'user123',
        mockEvent.rewards![0].rewardPoint,
      );
    });
  });

  describe('findRequestById', () => {
    it('should return request if found', async () => {
      const mockRequest = { requestId: 'request123' };
      requestRepository.findById.mockResolvedValue(mockRequest as any);

      const result = await service.findRequestById('request123');

      expect(requestRepository.findById).toHaveBeenCalledWith('request123');
      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundException if request not found', async () => {
      requestRepository.findById.mockResolvedValue(null);

      await expect(service.findRequestById('request123')).rejects.toThrow(RpcException);

      expect(requestRepository.findById).toHaveBeenCalledWith('request123');
    });
  });

  describe('findAllRequests', () => {
    it('should return all requests with total count', async () => {
      const mockRequests = [
        {
          _id: new Types.ObjectId(),
          requestId: 'request1',
          userId: 'user123',
          eventId: 'event123',
          status: RequestStatus.APPROVED,
          createdAt: new Date('2024-03-20'),
          updatedAt: new Date('2024-03-20'),
          rejectionReason: null,
          approvedAt: new Date('2024-03-20'),
          completedAt: null,
          metadata: {},
        },
        {
          _id: new Types.ObjectId(),
          requestId: 'request2',
          userId: 'user456',
          eventId: 'event456',
          status: RequestStatus.APPROVED,
          createdAt: new Date('2024-03-19'),
          updatedAt: new Date('2024-03-19'),
          rejectionReason: null,
          approvedAt: new Date('2024-03-19'),
          completedAt: null,
          metadata: {},
        },
      ] as unknown as Request[];

      requestRepository.findAll.mockResolvedValue(mockRequests);
      requestRepository.count.mockResolvedValue(2);

      const result = await service.findAllRequests();

      expect(result).toEqual({
        requests: mockRequests,
        totalCount: 2,
      });
      expect(requestRepository.findAll).toHaveBeenCalled();
      expect(requestRepository.count).toHaveBeenCalled();
    });

    it('should return empty array with zero count when no requests exist', async () => {
      requestRepository.findAll.mockResolvedValue([]);
      requestRepository.count.mockResolvedValue(0);

      const result = await service.findAllRequests();

      expect(result).toEqual({
        requests: [],
        totalCount: 0,
      });
    });
  });

  describe('findRequestsByUserId', () => {
    const userId = 'user123';

    it('should return user requests with total count', async () => {
      const mockRequests = [
        {
          _id: new Types.ObjectId(),
          requestId: 'request1',
          userId,
          eventId: 'event123',
          status: RequestStatus.APPROVED,
          createdAt: new Date('2024-03-20'),
          updatedAt: new Date('2024-03-20'),
          rejectionReason: null,
          approvedAt: new Date('2024-03-20'),
          completedAt: null,
          metadata: {},
        },
        {
          _id: new Types.ObjectId(),
          requestId: 'request2',
          userId,
          eventId: 'event456',
          status: RequestStatus.APPROVED,
          createdAt: new Date('2024-03-19'),
          updatedAt: new Date('2024-03-19'),
          rejectionReason: null,
          approvedAt: new Date('2024-03-19'),
          completedAt: null,
          metadata: {},
        },
      ] as unknown as Request[];

      requestRepository.findByUserId.mockResolvedValue(mockRequests);
      requestRepository.countByUserId.mockResolvedValue(2);

      const result = await service.findRequestsByUserId(userId);

      expect(result).toEqual({
        requests: mockRequests,
        totalCount: 2,
      });
      expect(requestRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(requestRepository.countByUserId).toHaveBeenCalledWith(userId);
    });

    it('should return empty array with zero count when user has no requests', async () => {
      requestRepository.findByUserId.mockResolvedValue([]);
      requestRepository.countByUserId.mockResolvedValue(0);

      const result = await service.findRequestsByUserId(userId);

      expect(result).toEqual({
        requests: [],
        totalCount: 0,
      });
    });
  });
});
