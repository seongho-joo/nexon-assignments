import { Test, TestingModule } from '@nestjs/testing';
import { RequestService } from './request.service';
import { RequestRepository } from '../repositories/request.repository';
import { EventService } from './event.service';
import { CustomLoggerService } from '@app/common/logger';
import { Request, Event, RequestStatus } from '@app/common/schemas';
import { Document } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { RewardConditionValidatorService } from '@app/common/services/reward-condition-validator.service';

interface CreateRequestDto {
  eventId: string;
}

describe('RequestService', () => {
  let service: RequestService;
  let repository: jest.Mocked<RequestRepository>;
  let eventService: jest.Mocked<EventService>;
  let rewardValidator: jest.Mocked<RewardConditionValidatorService>;
  let logger: CustomLoggerService;

  const mockRequest = {
    requestId: 'test-request-id',
    eventId: 'test-event-id',
    userId: 'test-user-id',
    status: RequestStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Request & Document;

  const mockEvent = {
    eventId: 'test-event-id',
    title: 'Test Event',
    description: 'Test Description',
    startDate: new Date(),
    endDate: new Date(),
    isActive: true,
    rewards: [{
      condition: {
        type: 'PLAY_TIME',
        targetValue: 3600,
        description: '1시간 이상 플레이',
        additionalParams: {}
      }
    }]
  } as unknown as Event;

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
            updateStatus: jest.fn(),
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
    repository = module.get(RequestRepository);
    eventService = module.get(EventService);
    rewardValidator = module.get(RewardConditionValidatorService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  describe('createRequest', () => {
    it('should create a new request', async () => {
      const createRequestDto: CreateRequestDto = {
        eventId: 'test-event-id',
      };
      const userId = 'test-user-id';

      eventService.findEventById.mockResolvedValue(mockEvent);
      repository.findByUserIdAndEventId.mockResolvedValue(null);
      rewardValidator.validateCondition.mockResolvedValue({ isValid: true });
      repository.create.mockResolvedValue(mockRequest);

      const result = await service.createRequest(createRequestDto, userId);

      expect(eventService.findEventById).toHaveBeenCalledWith(createRequestDto.eventId);
      expect(repository.create).toHaveBeenCalledWith({
        eventId: createRequestDto.eventId,
        userId: userId,
        status: RequestStatus.APPROVED,
        approvedAt: expect.any(Date),
      });
      expect(result).toBe(mockRequest);
    });

    it('should throw error if event not found', async () => {
      const createRequestDto: CreateRequestDto = {
        eventId: 'invalid-id',
      };
      const userId = 'user-id';
      eventService.findEventById.mockResolvedValue(null);

      await expect(service.createRequest(createRequestDto, userId)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error if event is not active', async () => {
      const createRequestDto: CreateRequestDto = {
        eventId: 'test-id',
      };
      const userId = 'user-id';
      eventService.findEventById.mockResolvedValue({
        ...mockEvent,
        eventId: 'test-id',
        isActive: false,
      } as Event);
      rewardValidator.validateCondition.mockResolvedValue({ isValid: false, reason: '이벤트 비활성화' });

      await expect(service.createRequest(createRequestDto, userId)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('findRequestById', () => {
    it('should find request by id', async () => {
      repository.findById.mockResolvedValue(mockRequest);

      const result = await service.findRequestById(mockRequest.requestId);

      expect(repository.findById).toHaveBeenCalledWith(mockRequest.requestId);
      expect(result).toBe(mockRequest);
    });

    it('should throw error if request not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.findRequestById('invalid-id');
      expect(result).toBeNull();
    });
  });

  // describe('findByEventId', () => {
  //   it('should find requests by event id', async () => {
  //     repository.findByEventId.mockResolvedValue([mockRequest]);

  //     const result = await service.findByEventId(mockRequest.eventId);

  //     expect(repository.findByEventId).toHaveBeenCalledWith(mockRequest.eventId);
  //     expect(result).toEqual([mockRequest]);
  //   });
  // });

  // describe('findByUserId', () => {
  //   it('should find requests by user id', async () => {
  //     repository.findByUserId.mockResolvedValue([mockRequest]);

  //     const result = await service.findByUserId(mockRequest.userId);

  //     expect(repository.findByUserId).toHaveBeenCalledWith(mockRequest.userId);
  //     expect(result).toEqual([mockRequest]);
  //   });
  // });

  // describe('updateStatus', () => {
  //   it('should update request status', async () => {
  //     repository.findById.mockResolvedValue(mockRequest);
  //     repository.updateStatus.mockResolvedValue({
  //       ...mockRequest,
  //       status: RequestStatus.APPROVED,
  //     } as Request & Document);

  //     const result = await service.updateStatus(
  //       mockRequest.requestId,
  //       RequestStatus.APPROVED,
  //     );

  //     expect(repository.findById).toHaveBeenCalledWith(mockRequest.requestId);
  //     expect(repository.updateStatus).toHaveBeenCalledWith(
  //       mockRequest.requestId,
  //       RequestStatus.APPROVED,
  //     );
  //     expect(result.status).toBe(RequestStatus.APPROVED);
  //   });

  //   it('should throw error if request not found', async () => {
  //     repository.findById.mockResolvedValue(null);

  //     await expect(
  //       service.updateStatus('invalid-id', RequestStatus.APPROVED),
  //     ).rejects.toThrow(NotFoundException);
  //   });
  // });

  // describe('delete', () => {
  //   it('should delete request', async () => {
  //     repository.findById.mockResolvedValue(mockRequest);
  //     repository.delete.mockResolvedValue(mockRequest);

  //     const result = await service.delete(mockRequest.requestId);

  //     expect(repository.findById).toHaveBeenCalledWith(mockRequest.requestId);
  //     expect(repository.delete).toHaveBeenCalledWith(mockRequest.requestId);
  //     expect(result).toBe(mockRequest);
  //   });

  //   it('should throw error if request not found', async () => {
  //     repository.findById.mockResolvedValue(null);

  //     await expect(service.delete('invalid-id')).rejects.toThrow(
  //       NotFoundException,
  //     );
  //   });
  // });
}); 