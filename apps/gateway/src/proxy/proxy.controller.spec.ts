import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { ProxyController } from './proxy.controller';
import { CustomLoggerService } from '@app/common/logger';
import { UserRole } from '@app/common/schemas';
import { Request, Response } from 'express';

describe('ProxyController', () => {
  let controller: ProxyController;
  let authClient: jest.Mocked<ClientProxy>;
  let eventClient: jest.Mocked<ClientProxy>;
  let logger: jest.Mocked<CustomLoggerService>;

  const mockRequest = {
    method: 'POST',
    url: '/auth/sign-up',
    body: {
      username: 'testuser',
      password: 'test123!@#',
      role: UserRole.USER,
    },
    query: {},
    params: {},
    headers: {},
    path: '/auth/sign-up',
  } as unknown as Request;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const mockAuthClient = {
      send: jest.fn(),
    };

    const mockEventClient = {
      send: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [
        {
          provide: 'AUTH_SERVICE',
          useValue: mockAuthClient,
        },
        {
          provide: 'EVENT_SERVICE',
          useValue: mockEventClient,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
    authClient = module.get('AUTH_SERVICE');
    eventClient = module.get('EVENT_SERVICE');
    logger = module.get(CustomLoggerService);
  });

  describe('handleSignUp', () => {
    const signUpResponse = {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
      data: { userId: 'test-id' },
      timestamp: expect.any(String),
    };

    it('should successfully handle sign up request', () => {
      authClient.send.mockReturnValue(of(signUpResponse));

      controller.handleSignUp(mockRequest, mockResponse, mockRequest.body, {});

      expect(authClient.send).toHaveBeenCalledWith(
        { cmd: 'proxy' },
        expect.objectContaining({
          path: 'sign-up',
          method: 'POST',
          body: expect.any(Object),
        }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith(signUpResponse);
    });

    it('should handle error during sign up', () => {
      const error = { message: 'Username already exists', status: HttpStatus.BAD_REQUEST };
      authClient.send.mockReturnValue(throwError(() => error));

      controller.handleSignUp(mockRequest, mockResponse, mockRequest.body, {});

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Username already exists',
        }),
      );
    });
  });

  describe('handleLogin', () => {
    const loginResponse = {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: {
        accessToken: 'test-token',
        user: {
          id: 'test-id',
          username: 'testuser',
          role: UserRole.USER,
        },
      },
      timestamp: expect.any(String),
    };

    it('should successfully handle login request', () => {
      authClient.send.mockReturnValue(of(loginResponse));

      controller.handleLogin(mockRequest, mockResponse, {
        username: 'testuser',
        password: 'test123!@#',
      });

      expect(authClient.send).toHaveBeenCalledWith(
        { cmd: 'proxy' },
        expect.objectContaining({
          path: 'login',
          method: 'POST',
          body: expect.any(Object),
        }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(loginResponse);
    });

    it('should handle invalid credentials', () => {
      const error = { message: 'Invalid credentials', status: HttpStatus.UNAUTHORIZED };
      authClient.send.mockReturnValue(throwError(() => error));

      controller.handleLogin(mockRequest, mockResponse, {
        username: 'testuser',
        password: 'wrongpassword',
      });

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid credentials',
        }),
      );
    });
  });

  describe('handleNotFound', () => {
    it('should return 404 for unknown paths', () => {
      const notFoundRequest = {
        ...mockRequest,
        method: 'GET',
        url: '/unknown',
        path: '/unknown',
      } as unknown as Request;

      controller.handleNotFound(notFoundRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Cannot GET /unknown',
          code: 'NOT_FOUND',
        }),
      );
    });
  });
}); 