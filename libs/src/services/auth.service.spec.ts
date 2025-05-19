/* eslint-disable @typescript-eslint/unbound-method,@typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument*/
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { RedisService } from '@app/common/redis';
import { User, UserRole } from '@app/common/schemas';
import { RedisEnum } from '@app/common/redis/redis.enum';
import {
  GetRolePermissionsDto,
  SetRolePermissionDto,
} from '@app/common/dto/role/role-permission.dto';
import { PlayTimeTrackerService } from './play-time-tracker.service';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;
  let playTimeTrackerService: jest.Mocked<PlayTimeTrackerService>;

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

  const mockToken = 'test-token';
  const mockPayload = {
    userId: mockUser.id,
    id: mockUser.id,
    username: mockUser.username,
    role: mockUser.role,
  };

  beforeEach(async () => {
    const mockUserService = {
      findByUsername: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      sAdd: jest.fn(),
      sRem: jest.fn(),
      sMembers: jest.fn(),
      increment: jest.fn(),
    };

    const mockPlayTimeTrackerService = {
      startSession: jest.fn(),
      endSession: jest.fn(),
      getPlayTime: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PlayTimeTrackerService,
          useValue: mockPlayTimeTrackerService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
    playTimeTrackerService = module.get(PlayTimeTrackerService);

    jwtService.sign.mockReturnValue(mockToken);
  });

  describe('validateUser', () => {
    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('should return user when credentials are valid', async () => {
      userService.findByUsername.mockResolvedValue(mockUser);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toBe(mockUser);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
    });

    it('should throw when user not found', async () => {
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent', 'password123')).rejects.toThrow(
        RpcException,
      );
    });

    it('should throw when user is inactive', async () => {
      userService.findByUsername.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as unknown as User);

      await expect(service.validateUser('testuser', 'password123')).rejects.toThrow(RpcException);
    });

    it('should throw when password is invalid', async () => {
      userService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('testuser', 'wrongpass')).rejects.toThrow(RpcException);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('should return token and user info on successful login', async () => {
      userService.findByUsername.mockResolvedValue(mockUser);

      const result = await service.login('testuser', 'password123');

      expect(result).toEqual({
        accessToken: mockToken,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
        },
      });

      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw when login fails', async () => {
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.login('nonexistent', 'password123')).rejects.toThrow(RpcException);
    });
  });

  describe('refreshToken', () => {
    it('should return new token for valid user', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.refreshToken(mockUser.id);

      expect(result).toEqual({
        accessToken: mockToken,
      });

      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw when user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(service.refreshToken('nonexistent')).rejects.toThrow(RpcException);
    });

    it('should throw when user is inactive', async () => {
      userService.findById.mockResolvedValue({ ...mockUser, isActive: false } as unknown as User);

      await expect(service.refreshToken(mockUser.id)).rejects.toThrow(RpcException);
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redisService.get.mockResolvedValue(mockToken);

      const result = await service.validateToken(mockToken);

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateToken('invalid-token');

      expect(result).toBe(false);
    });

    it('should return false when stored token does not match', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      redisService.get.mockResolvedValue('different-token');

      const result = await service.validateToken(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('should delete token from redis', async () => {
      await service.logout(mockUser.id);

      const { key } = RedisEnum.AUTH_TOKEN.getKeyAndTTL(mockUser.id);
      expect(redisService.delete).toHaveBeenCalledWith(key);
    });
  });

  describe('Role Permission Management', () => {
    describe('setRolePermission', () => {
      const dto: SetRolePermissionDto = {
        role: UserRole.OPERATOR,
        method: 'GET',
        path: '/api/events',
        allow: true,
      };

      it('should add permission when allow is true', async () => {
        await service.setRolePermission(dto);

        expect(redisService.sAdd).toHaveBeenCalledWith(
          expect.stringContaining('OPERATOR:GET'),
          '/api/events',
        );
      });

      it('should remove permission when allow is false', async () => {
        await service.setRolePermission({ ...dto, allow: false });

        expect(redisService.sRem).toHaveBeenCalledWith(
          expect.stringContaining('OPERATOR:GET'),
          '/api/events',
        );
      });

      it('should throw error when trying to modify admin permissions', async () => {
        const adminDto = { ...dto, role: UserRole.ADMIN };

        await expect(service.setRolePermission(adminDto)).rejects.toThrow(RpcException);
      });
    });

    describe('getRolePermissions', () => {
      const dto: GetRolePermissionsDto = {
        role: UserRole.OPERATOR,
        method: 'GET',
      };

      it('should return permissions for specific method', async () => {
        const mockPaths = ['/api/events', '/api/rewards'];
        redisService.sMembers.mockResolvedValue(mockPaths);

        const result = await service.getRolePermissions(dto);

        expect(result).toEqual({
          GET: mockPaths,
        });
        expect(redisService.sMembers).toHaveBeenCalledWith(expect.stringContaining('OPERATOR:GET'));
      });

      it('should return permissions for all methods when method is not specified', async () => {
        const mockPaths = ['/api/events'];
        redisService.sMembers.mockResolvedValue(mockPaths);

        const result = await service.getRolePermissions({
          role: UserRole.OPERATOR,
        });

        expect(result).toEqual({
          GET: mockPaths,
          POST: mockPaths,
          PUT: mockPaths,
          DELETE: mockPaths,
          PATCH: mockPaths,
        });
        expect(redisService.sMembers).toHaveBeenCalledTimes(5);
      });
    });

    describe('removeRolePermission', () => {
      const dto: SetRolePermissionDto = {
        role: UserRole.OPERATOR,
        method: 'GET',
        path: '/api/events',
        allow: false,
      };

      it('should remove permission', async () => {
        await service.removeRolePermission(dto);

        expect(redisService.sRem).toHaveBeenCalledWith(
          expect.stringContaining('OPERATOR:GET'),
          '/api/events',
        );
      });

      it('should throw error when trying to modify admin permissions', async () => {
        const adminDto = { ...dto, role: UserRole.ADMIN };

        await expect(service.removeRolePermission(adminDto)).rejects.toThrow(RpcException);
      });
    });
  });
});
