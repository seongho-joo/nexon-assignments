import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AuthGateway } from './auth.gateway';
import { CustomLoggerService } from '@app/common/logger';
import { UserService } from '@app/common/services/user.service';
import { AuthService } from '@app/common/services/auth.service';
import { User, UserRole } from '@app/common/schemas';
import { NotFoundException } from '@app/common/exceptions';

interface ProxyPayload {
  path: string;
  method: string;
  body: {
    body: unknown;
    query: unknown;
    params: unknown;
    headers: unknown;
  };
}

describe('AuthGateway', () => {
  let gateway: AuthGateway;
  let userService: jest.Mocked<UserService>;
  let authService: jest.Mocked<AuthService>;
  let logger: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    const mockUserService = {
      register: jest.fn(),
      updateRole: jest.fn(),
    };

    const mockAuthService = {
      login: jest.fn(),
      setRolePermission: jest.fn(),
      getRolePermissions: jest.fn(),
      removeRolePermission: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGateway,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    gateway = module.get<AuthGateway>(AuthGateway);
    userService = module.get(UserService);
    authService = module.get(AuthService);
    logger = module.get(CustomLoggerService);
  });

  describe('handleProxyRequest', () => {
    it('should throw BadRequestException when body is missing', async () => {
      const payload: ProxyPayload = {
        path: 'sign-up',
        method: 'POST',
        body: {
          body: null,
          query: null,
          params: null,
          headers: null,
        },
      };

      await expect(gateway.handleProxyRequest(payload)).rejects.toThrow(RpcException);
    });

    it('should throw NotFoundException for unknown path', async () => {
      const payload: ProxyPayload = {
        path: 'unknown',
        method: 'POST',
        body: {
          body: {},
          query: {},
          params: {},
          headers: {},
        },
      };

      await expect(gateway.handleProxyRequest(payload)).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleSignUp', () => {
    const signUpPayload: ProxyPayload = {
      path: 'sign-up',
      method: 'POST',
      body: {
        body: {
          username: 'testuser',
          password: 'test123!@#',
          role: UserRole.USER,
        },
        query: {},
        params: {},
        headers: {},
      },
    };

    it('should successfully register a user', async () => {
      const userId = 'test-id';
      userService.register.mockResolvedValue(userId);

      const result = await gateway.handleProxyRequest(signUpPayload);

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: 'User registered successfully',
        data: { userId },
        timestamp: expect.any(String),
      });
      expect(userService.register).toHaveBeenCalledWith(
        'testuser',
        'test123!@#',
        UserRole.USER,
        undefined,
      );
    });

    it('should handle registration error', async () => {
      userService.register.mockRejectedValue(new Error('Username already exists'));

      await expect(gateway.handleProxyRequest(signUpPayload)).rejects.toThrow();
    });
  });

  describe('handleLogin', () => {
    const loginPayload: ProxyPayload = {
      path: 'login',
      method: 'POST',
      body: {
        body: {
          username: 'testuser',
          password: 'test123!@#',
        },
        query: {},
        params: {},
        headers: {},
      },
    };

    it('should successfully login user', async () => {
      const loginResponse = {
        accessToken: 'test-token',
        user: {
          id: 'test-id',
          username: 'testuser',
          role: UserRole.USER,
        },
      };
      authService.login.mockResolvedValue(loginResponse);

      const result = await gateway.handleProxyRequest(loginPayload);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        data: loginResponse,
        timestamp: expect.any(String),
      });
      expect(authService.login).toHaveBeenCalledWith('testuser', 'test123!@#');
    });

    it('should handle login error', async () => {
      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(gateway.handleProxyRequest(loginPayload)).rejects.toThrow();
    });
  });

  describe('handleRolePermissions', () => {
    const setPermissionPayload: ProxyPayload = {
      path: 'role-permissions',
      method: 'POST',
      body: {
        body: {
          role: UserRole.OPERATOR,
          method: 'GET',
          path: '/api/events',
          allow: true,
        },
        query: {},
        params: {},
        headers: {},
      },
    };

    it('should successfully set role permission', async () => {
      authService.setRolePermission.mockResolvedValue(undefined);

      const result = await gateway.handleProxyRequest(setPermissionPayload);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Role permission added successfully',
        data: undefined,
        timestamp: expect.any(String),
      });
    });

    it('should successfully get role permissions', async () => {
      const permissions = {
        GET: ['/api/events'],
      };
      authService.getRolePermissions.mockResolvedValue(permissions);

      const getPermissionsPayload: ProxyPayload = {
        path: 'role-permissions',
        method: 'GET',
        body: {
          body: {},
          query: {
            role: UserRole.OPERATOR,
            method: 'GET',
          },
          params: {},
          headers: {},
        },
      };

      const result = await gateway.handleProxyRequest(getPermissionsPayload);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Role permissions retrieved successfully',
        data: permissions,
        timestamp: expect.any(String),
      });
    });
  });

  describe('handleUpdateUserRole', () => {
    const updateRolePayload: ProxyPayload = {
      path: 'user-role',
      method: 'PUT',
      body: {
        body: {
          userId: 'test-id',
          newRole: UserRole.OPERATOR,
        },
        query: {},
        params: {},
        headers: {},
      },
    };

    it('should successfully update user role', async () => {
      const updatedUser: Partial<User> = {
        userId: 'test-id',
        username: 'testuser',
        role: UserRole.OPERATOR,
      };
      userService.updateRole.mockResolvedValue(updatedUser as User);

      const result = await gateway.handleProxyRequest(updateRolePayload);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'User role updated successfully',
        data: updatedUser,
        timestamp: expect.any(String),
      });
      expect(userService.updateRole).toHaveBeenCalledWith('test-id', UserRole.OPERATOR);
    });

    it('should handle update role error', async () => {
      userService.updateRole.mockRejectedValue(new Error('User not found'));

      await expect(gateway.handleProxyRequest(updateRolePayload)).rejects.toThrow();
    });
  });
});
