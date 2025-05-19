import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, RequestStatus } from '@app/common/schemas';
import { RequestRepository } from './request.repository';

type MockModel = {
  find: jest.Mock;
  findById: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  countDocuments: jest.Mock;
  sort: jest.Mock;
  exec: jest.Mock;
};

describe('RequestRepository', () => {
  let repository: RequestRepository;
  let mockRequestModel: MockModel;

  beforeEach(async () => {
    mockRequestModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestRepository,
        {
          provide: getModelToken(Request.name),
          useValue: mockRequestModel,
        },
      ],
    }).compile();

    repository = module.get<RequestRepository>(RequestRepository);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup common mock implementations
    mockRequestModel.find.mockReturnThis();
    mockRequestModel.findById.mockReturnThis();
    mockRequestModel.findOne.mockReturnThis();
    mockRequestModel.countDocuments.mockReturnThis();
    mockRequestModel.sort.mockReturnThis();
  });

  describe('create', () => {
    it('should create a new request', async () => {
      const mockRequest = {
        userId: 'user123',
        eventId: 'event123',
        status: RequestStatus.APPROVED,
      };
      const mockCreatedRequest = { ...mockRequest, requestId: 'request123' };

      mockRequestModel.create.mockResolvedValue(mockCreatedRequest);

      const result = await repository.create(mockRequest);

      expect(mockRequestModel.create).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockCreatedRequest);
    });
  });

  describe('findById', () => {
    it('should find request by ID', async () => {
      const mockRequest = { requestId: 'request123', userId: 'user123' };
      mockRequestModel.exec.mockResolvedValue(mockRequest);

      const result = await repository.findById('request123');

      expect(mockRequestModel.findById).toHaveBeenCalledWith('request123');
      expect(result).toEqual(mockRequest);
    });

    it('should return null when request not found', async () => {
      mockRequestModel.exec.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserIdAndEventId', () => {
    it('should find request by userId and eventId', async () => {
      const mockRequest = { requestId: 'request123', userId: 'user123', eventId: 'event123' };
      mockRequestModel.exec.mockResolvedValue(mockRequest);

      const result = await repository.findByUserIdAndEventId('user123', 'event123');

      expect(mockRequestModel.findOne).toHaveBeenCalledWith({ userId: 'user123', eventId: 'event123' });
      expect(result).toEqual(mockRequest);
    });

    it('should return null when request not found', async () => {
      mockRequestModel.exec.mockResolvedValue(null);

      const result = await repository.findByUserIdAndEventId('user123', 'event123');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all requests sorted by createdAt desc', async () => {
      const mockRequests = [
        { requestId: 'request1', createdAt: new Date('2024-03-20') },
        { requestId: 'request2', createdAt: new Date('2024-03-19') },
      ];
      mockRequestModel.exec.mockResolvedValue(mockRequests);

      const result = await repository.findAll();

      expect(mockRequestModel.find).toHaveBeenCalled();
      expect(mockRequestModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockRequests);
    });

    it('should return empty array when no requests exist', async () => {
      mockRequestModel.exec.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return total count of requests', async () => {
      mockRequestModel.exec.mockResolvedValue(10);

      const result = await repository.count();

      expect(mockRequestModel.countDocuments).toHaveBeenCalled();
      expect(result).toBe(10);
    });

    it('should return 0 when no requests exist', async () => {
      mockRequestModel.exec.mockResolvedValue(0);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });

  describe('findByUserId', () => {
    it('should find all requests for a user sorted by createdAt desc', async () => {
      const mockRequests = [
        { requestId: 'request1', userId: 'user123', createdAt: new Date('2024-03-20') },
        { requestId: 'request2', userId: 'user123', createdAt: new Date('2024-03-19') },
      ];
      mockRequestModel.exec.mockResolvedValue(mockRequests);

      const result = await repository.findByUserId('user123');

      expect(mockRequestModel.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockRequestModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockRequests);
    });

    it('should return empty array when user has no requests', async () => {
      mockRequestModel.exec.mockResolvedValue([]);

      const result = await repository.findByUserId('user123');

      expect(result).toEqual([]);
    });
  });

  describe('countByUserId', () => {
    it('should return count of requests for a user', async () => {
      mockRequestModel.exec.mockResolvedValue(5);

      const result = await repository.countByUserId('user123');

      expect(mockRequestModel.countDocuments).toHaveBeenCalledWith({ userId: 'user123' });
      expect(result).toBe(5);
    });

    it('should return 0 when user has no requests', async () => {
      mockRequestModel.exec.mockResolvedValue(0);

      const result = await repository.countByUserId('user123');

      expect(result).toBe(0);
    });
  });
}); 