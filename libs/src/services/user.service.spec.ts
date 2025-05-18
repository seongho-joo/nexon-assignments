/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { CustomLoggerService } from '@app/common/logger';
import { UserRepository } from '@app/common/repositories/user.repository';
import { User, UserRole } from '@app/common/schemas';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'test-id',
    userId: 'test-id',
    username: 'testuser',
    password: 'hashedpassword',
    role: UserRole.USER,
    isActive: true,
    balance: 0,
    lastLoginAt: new Date(),
  } as unknown as User;

  beforeEach(async () => {
    const mockUserRepository = {
      findByUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateRole: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);
    configService = module.get(ConfigService);

    configService.get.mockReturnValue('test-admin-key');
  });

  describe('findByUsername', () => {
    it('should return user when found', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser);
      const result = await service.findByUsername('testuser');
      expect(result).toBe(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findByUsername.mockResolvedValue(null);
      const result = await service.findByUsername('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      const result = await service.findById('test-id');
      expect(result).toBe(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
    });

    it('should create a new user successfully', async () => {
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue('new-user-id');

      const result = await service.register('newuser', 'password123');

      expect(result).toBe('new-user-id');
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword',
        role: UserRole.USER,
        balance: 0,
        isActive: true,
      });
    });

    it('should throw error when username already exists', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register('testuser', 'password123')).rejects.toThrow(RpcException);
    });

    it('should throw error when creating admin without admin key', async () => {
      await expect(service.register('admin', 'password123', UserRole.ADMIN)).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw error when creating admin with invalid admin key', async () => {
      configService.get.mockReturnValue('different-admin-key');

      await expect(
        service.register('admin', 'password123', UserRole.ADMIN, 'test-admin-key'),
      ).rejects.toThrow(RpcException);
    });

    it('should create admin user with valid admin key', async () => {
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue('new-admin-id');

      const result = await service.register(
        'admin',
        'password123',
        UserRole.ADMIN,
        'test-admin-key',
      );

      expect(result).toBe('new-admin-id');
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'admin',
        password: 'hashedpassword',
        role: UserRole.ADMIN,
        balance: 0,
        isActive: true,
      });
    });
  });
});
