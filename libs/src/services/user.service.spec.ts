/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { CustomLoggerService } from '@app/common/logger';
import { UserRepository } from '@app/common/repositories/user.repository';
import { UserRole } from '@app/common/schemas';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  const mockUserRepository = {
    findByUsername: jest.fn(),
    create: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
    mockConfigService.get.mockReturnValue('test-admin-key');
  });

  describe('register', () => {
    const username = 'testuser';
    const password = 'testpass';
    const hashedPassword = 'hashedPassword';

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
    });

    it('should successfully register a new user', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue('userId');

      const result = await service.register(username, password);

      expect(result).toBe('userId');
      expect(userRepository.findByUsername).toHaveBeenCalledWith(username);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        username,
        password: hashedPassword,
        role: UserRole.USER,
        balance: 0,
        isActive: true,
      });
    });

    it('should throw BadRequestException if username already exists', async () => {
      mockUserRepository.findByUsername.mockResolvedValue({ username });

      await expect(service.register(username, password)).rejects.toThrow(RpcException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if username or password is missing', async () => {
      await expect(service.register('', password)).rejects.toThrow(RpcException);
      await expect(service.register(username, '')).rejects.toThrow(RpcException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    describe('admin registration', () => {
      it('should successfully register an admin user with valid admin key', async () => {
        mockUserRepository.findByUsername.mockResolvedValue(null);
        mockUserRepository.create.mockResolvedValue('adminUserId');

        const result = await service.register(username, password, UserRole.ADMIN, 'test-admin-key');

        expect(result).toBe('adminUserId');
        expect(userRepository.create).toHaveBeenCalledWith({
          username,
          password: hashedPassword,
          role: UserRole.ADMIN,
          balance: 0,
          isActive: true,
        });
      });

      it('should throw UnauthorizedException if admin key is invalid', async () => {
        await expect(
          service.register(username, password, UserRole.ADMIN, 'wrong-key'),
        ).rejects.toThrow(RpcException);
        expect(userRepository.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException if admin key is missing for admin registration', async () => {
        await expect(service.register(username, password, UserRole.ADMIN)).rejects.toThrow(
          RpcException,
        );
        expect(userRepository.create).not.toHaveBeenCalled();
      });
    });
  });
});
