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

  const mockUser: Partial<User> = {
    _id: new Types.ObjectId('6460f5b082c8a2a97a4a89b1'),
    userId: 'user123',
    username: 'testuser',
    balance: 1000,
  };

  const mockEvent: Partial<Event> = {
    _id: new Types.ObjectId('6460f5b082c8a2a97a4a89b2'),
    eventId: 'event123',
    title: '테스트 이벤트',
    rewards: [
      {
        name: '플레이타임 보상',
        rewardPoint: 500,
        description: '1시간 플레이 보상',
        condition: {
          type: RewardConditionType.PLAY_TIME,
          targetValue: 60,
          description: '1시간 이상 플레이',
          additionalParams: {},
        },
      },
    ],
  };

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
    });

    it('should create a request and grant reward successfully', async () => {
      const result = await service.createRequest(createRequestDto, 'user123');

      expect(eventService.findEventById).toHaveBeenCalledWith('event123');
      expect(rewardConditionValidator.validateCondition).toHaveBeenCalledWith(
        mockEvent.rewards![0].condition,
        'user123',
      );
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
  });

  describe('grantReward', () => {
    const mockReward: Reward = {
      name: '플레이타임 보상',
      rewardPoint: 500,
      description: '1시간 플레이 보상',
      condition: {
        type: RewardConditionType.PLAY_TIME,
        targetValue: 60,
        description: '1시간 이상 플레이',
        additionalParams: {},
      },
    };

    beforeEach(() => {
      userRepository.findById.mockResolvedValue(mockUser as User);
      pointTransactionRepository.create.mockResolvedValue({} as any);
    });

    it('should grant reward points successfully', async () => {
      await service.grantReward(mockReward, mockUser.userId!, mockEvent as Event);

      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.userId);
      expect(userRepository.updateBalance).toHaveBeenCalledWith(
        mockUser.userId,
        mockUser.balance! + mockReward.rewardPoint,
      );
      expect(pointTransactionRepository.create).toHaveBeenCalledWith({
        userId: mockUser._id,
        amount: mockReward.rewardPoint,
        type: PointTransactionType.EVENT_REWARD,
        eventId: mockEvent._id,
        balanceAfter: mockUser.balance! + mockReward.rewardPoint,
        description: `[이벤트:${mockEvent.title}] 보상 지급`,
      });
    });

    it('should throw error if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.grantReward(mockReward, mockUser.userId!, mockEvent as Event),
      ).rejects.toThrow(RpcException);
    });

    it('should throw error if point transaction fails', async () => {
      pointTransactionRepository.create.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.grantReward(mockReward, mockUser.userId!, mockEvent as Event),
      ).rejects.toThrow(RpcException);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle user with no initial balance', async () => {
      const userWithNoBalance = { ...mockUser, balance: 0 };
      userRepository.findById.mockResolvedValue(userWithNoBalance as User);

      await service.grantReward(mockReward, mockUser.userId!, mockEvent as Event);

      expect(userRepository.updateBalance).toHaveBeenCalledWith(
        mockUser.userId,
        mockReward.rewardPoint,
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

    it('should return null if request not found', async () => {
      requestRepository.findById.mockResolvedValue(null);

      const result = await service.findRequestById('request123');

      expect(requestRepository.findById).toHaveBeenCalledWith('request123');
      expect(result).toBeNull();
    });
  });
});
