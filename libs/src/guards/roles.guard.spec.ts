import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@app/common/guards';
import { RedisService } from '@app/common/redis';
import { UserRole } from '@app/common/schemas';
import { ROLES_KEY } from '@app/common/decorators';
import { UnauthorizedException, ForbiddenException } from '@app/common/exceptions';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockRedisService = {
      sMembers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
    redisService = module.get(RedisService);
  });

  const mockExecutionContext = (
    role: UserRole | null,
    method: string,
    url: string,
  ): ExecutionContext => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { role } : undefined,
          method,
          url,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    return mockContext;
  };

  describe('canActivate', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === 'isPublic') return false;
        return null;
      });
    });

    it('should throw UnauthorizedException when user is not present', async () => {
      const context = mockExecutionContext(null, 'GET', '/api/events');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow access for admin role without checking permissions', async () => {
      const context = mockExecutionContext(UserRole.ADMIN, 'GET', '/api/events');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.sMembers).not.toHaveBeenCalled();
    });

    it('should check Redis for non-admin roles when no specific roles required', async () => {
      const context = mockExecutionContext(UserRole.OPERATOR, 'GET', '/api/events');
      redisService.sMembers.mockResolvedValue(['/api/events']);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.sMembers).toHaveBeenCalledWith('authorization:OPERATOR:GET');
    });

    it('should throw ForbiddenException when path is not allowed', async () => {
      const context = mockExecutionContext(UserRole.OPERATOR, 'GET', '/api/admin');
      redisService.sMembers.mockResolvedValue(['/api/events']);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should check required roles when specified', async () => {
      const context = mockExecutionContext(UserRole.ADMIN, 'GET', '/api/admin');
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === 'isPublic') return false;
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return null;
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.sMembers).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user role is not in required roles', async () => {
      const context = mockExecutionContext(UserRole.OPERATOR, 'GET', '/api/admin');
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === 'isPublic') return false;
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return null;
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when endpoint is public', async () => {
      const context = mockExecutionContext(null, 'GET', '/api/public');
      reflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === 'isPublic') return true;
        return null;
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.sMembers).not.toHaveBeenCalled();
    });

    it('should normalize path with ObjectId before checking Redis', async () => {
      const context = mockExecutionContext(
        UserRole.OPERATOR,
        'GET',
        '/api/users/682b6748f602613865fe0079/requests',
      );
      redisService.sMembers.mockResolvedValue(['/api/users/:userId/requests']);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.sMembers).toHaveBeenCalledWith('authorization:OPERATOR:GET');
    });

    it('should normalize path with multiple ObjectIds before checking Redis', async () => {
      const context = mockExecutionContext(
        UserRole.OPERATOR,
        'GET',
        '/api/users/682b6748f602613865fe0079/requests/682b68a3738dd058a1a3b27c',
      );
      redisService.sMembers.mockResolvedValue(['/api/users/:userId/requests/:requestId']);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.sMembers).toHaveBeenCalledWith('authorization:OPERATOR:GET');
    });
  });

  describe('normalizePathPattern', () => {
    it('should convert MongoDB ObjectId to parameter pattern', () => {
      const path = '/api/users/682b6748f602613865fe0079/requests/682b68a3738dd058a1a3b27c';
      const result = (guard as any).normalizePathPattern(path);
      expect(result).toBe('/api/users/:userId/requests/:requestId');
    });

    it('should handle paths without ObjectId', () => {
      const path = '/api/events';
      const result = (guard as any).normalizePathPattern(path);
      expect(result).toBe('/api/events');
    });

    it('should handle paths with single ObjectId', () => {
      const path = '/api/events/682b6748f602613865fe0079';
      const result = (guard as any).normalizePathPattern(path);
      expect(result).toBe('/api/events/:eventId');
    });

    it('should handle empty segments and api prefix', () => {
      const path = '/api//events';
      const result = (guard as any).normalizePathPattern(path);
      expect(result).toBe('/api//events');
    });

    it('should handle paths with non-plural resource names', () => {
      const path = '/api/event/682b6748f602613865fe0079';
      const result = (guard as any).normalizePathPattern(path);
      expect(result).toBe('/api/event/:eventId');
    });

    it('should handle query parameters correctly', () => {
      const path = '/api/events/682b6748f602613865fe0079?page=1&size=10';
      const result = (guard as any).normalizePathPattern(path);
      expect(result).toBe('/api/events/:eventId');
    });

    it('should handle multiple consecutive ObjectIds', () => {
      const path = '/api/events/682b6748f602613865fe0079/rewards/682b68a3738dd058a1a3b27c';
      const result = (guard as any).normalizePathPattern(path);
      expect(result).toBe('/api/events/:eventId/rewards/:rewardId');
    });
  });
});
