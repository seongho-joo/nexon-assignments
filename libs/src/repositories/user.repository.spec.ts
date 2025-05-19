/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserRepository } from '@app/common/repositories/user.repository';
import { User, UserRole } from '@app/common/schemas';
import { CustomLoggerService } from '@app/common/logger';

type MockModel = {
  findOne: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  updateOne: jest.Mock;
  exec: jest.Mock;
};

describe('UserRepository', () => {
  let repository: UserRepository;

  const mockUserModel: MockModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    exec: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockUserModel.findOne.mockReturnValue({ exec: mockUserModel.exec });
    mockUserModel.updateOne.mockReturnValue({ exec: mockUserModel.exec });
    mockUserModel.findById.mockReturnValue({ exec: mockUserModel.exec });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const mockUser = { username: 'testuser', userId: 'test-id' };

      mockUserModel.findOne().exec.mockResolvedValue(mockUser);

      const result = await repository.findByUsername('testuser');

      expect(result).toBe(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    });

    it('should return null when user not found', async () => {
      mockUserModel.findOne().exec.mockResolvedValue(null);

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user and return userId', async () => {
      const userId = 'new-user-id';
      const createParams = {
        username: 'newuser',
        password: 'hashedpassword',
        role: UserRole.USER,
        balance: 0,
        isActive: true,
      };
      mockUserModel.create.mockResolvedValue({ userId });

      const result = await repository.create(createParams);

      expect(result).toBe(userId);
      expect(mockUserModel.create).toHaveBeenCalledWith(createParams);
    });
  });

  describe('updateBalance', () => {
    it('should update user balance', async () => {
      const userId = 'test-id';
      const newBalance = 1000;
      mockUserModel.updateOne().exec.mockResolvedValue({ modifiedCount: 1 });

      await repository.updateBalance(userId, newBalance);

      expect(mockUserModel.updateOne).toHaveBeenCalledWith({ userId }, { balance: newBalance });
    });
  });

  describe('updateActiveStatus', () => {
    it('should update user active status', async () => {
      const userId = 'test-id';
      const isActive = false;
      mockUserModel.updateOne().exec.mockResolvedValue({ modifiedCount: 1 });

      await repository.updateActiveStatus(userId, isActive);

      expect(mockUserModel.updateOne).toHaveBeenCalledWith({ userId }, { isActive });
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const mockUser = { userId: 'test-id', username: 'testuser' };
      mockUserModel.findById().exec.mockResolvedValue(mockUser);

      const result = await repository.findById('test-id');

      expect(result).toBe(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith('test-id');
    });

    it('should return null when user not found', async () => {
      mockUserModel.findById().exec.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
