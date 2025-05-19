import { Test, TestingModule } from '@nestjs/testing';
import { RequestGateway } from './request.gateway';
import { RequestService } from '@app/common/services/request.service';
import { CustomLoggerService } from '@app/common/logger';
import { Request, RequestStatus } from '@app/common/schemas';
import { Document } from 'mongoose';
import { HttpStatus, NotFoundException } from '@nestjs/common';

interface ProxyPayload {
  body: any;
  query: any;
  params: any;
  headers: any;
}

// Extend Request type to include timestamps
interface RequestWithTimestamps extends Request {
  createdAt: Date;
  updatedAt: Date;
}

describe('RequestGateway', () => {
  let gateway: RequestGateway;
  let service: jest.Mocked<RequestService>;
  let logger: CustomLoggerService;

  const mockRequest = {
    requestId: 'test-request-id',
    eventId: 'test-event-id',
    userId: 'test-user-id',
    status: RequestStatus.PENDING,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
  } as unknown as RequestWithTimestamps & Document;

  const mockRequestList = {
    requests: [
      mockRequest,
      {
        ...mockRequest,
        _id: 'test-request-id-2',
      } as unknown as RequestWithTimestamps & Document,
    ],
    totalCount: 2,
  } as { requests: Request[]; totalCount: number };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestGateway,
        {
          provide: RequestService,
          useValue: {
            createRequest: jest.fn(),
            findRequestById: jest.fn(),
            findAllRequests: jest.fn(),
            findRequestsByUserId: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RequestGateway>(RequestGateway);
    service = module.get(RequestService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  describe('handleRequest', () => {
    it('should handle GET /requests', async () => {
      const data = {
        path: 'requests',
        method: 'GET',
        body: {
          body: {},
          headers: {},
          query: {},
          params: {},
        },
      };

      service.findAllRequests.mockResolvedValue(mockRequestList);

      const result = await gateway.handleRequest(data);

      expect(service.findAllRequests).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '요청 목록을 성공적으로 조회했습니다.',
        data: {
          requests: expect.arrayContaining([
            expect.objectContaining({
              requestId: mockRequest._id,
              eventId: mockRequest.eventId,
              userId: mockRequest.userId,
              status: mockRequest.status,
              createdAt: mockRequest.createdAt,
              updatedAt: mockRequest.updatedAt,
            }),
            expect.objectContaining({
              requestId: 'test-request-id-2',
              eventId: mockRequest.eventId,
              userId: mockRequest.userId,
              status: mockRequest.status,
              createdAt: mockRequest.createdAt,
              updatedAt: mockRequest.updatedAt,
            }),
          ]),
          totalCount: 2,
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle GET /users/:userId/requests', async () => {
      const data = {
        path: 'users/test-user-id/requests',
        method: 'GET',
        body: {
          body: {},
          headers: {},
          query: {},
          params: {},
        },
      };

      service.findRequestsByUserId.mockResolvedValue(mockRequestList);

      const result = await gateway.handleRequest(data);

      expect(service.findRequestsByUserId).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '사용자의 요청 목록을 성공적으로 조회했습니다.',
        data: {
          requests: expect.arrayContaining([
            expect.objectContaining({
              requestId: mockRequest._id,
              eventId: mockRequest.eventId,
              userId: mockRequest.userId,
              status: mockRequest.status,
              createdAt: mockRequest.createdAt,
              updatedAt: mockRequest.updatedAt,
            }),
            expect.objectContaining({
              requestId: 'test-request-id-2',
              eventId: mockRequest.eventId,
              userId: mockRequest.userId,
              status: mockRequest.status,
              createdAt: mockRequest.createdAt,
              updatedAt: mockRequest.updatedAt,
            }),
          ]),
          totalCount: 2,
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle GET /users/:userId/requests/:requestId', async () => {
      const data = {
        path: 'users/test-user-id/requests/test-request-id',
        method: 'GET',
        body: {
          body: {},
          headers: {},
          query: {},
          params: {},
        },
      };

      service.findRequestById.mockResolvedValue(mockRequest);

      const result = await gateway.handleRequest(data);

      expect(service.findRequestById).toHaveBeenCalledWith('test-request-id');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '요청을 성공적으로 조회했습니다.',
        data: expect.objectContaining({
          requestId: mockRequest._id,
          eventId: mockRequest.eventId,
          userId: mockRequest.userId,
          status: mockRequest.status,
          createdAt: mockRequest.createdAt,
          updatedAt: mockRequest.updatedAt,
        }),
        timestamp: expect.any(String),
      });
    });

    it('should handle POST /requests', async () => {
      const data = {
        path: 'requests',
        method: 'POST',
        body: {
          body: { eventId: mockRequest.eventId },
          headers: { 'user-id': mockRequest.userId },
          query: {},
          params: {},
        },
      };

      service.createRequest.mockResolvedValue(mockRequest);

      const result = await gateway.handleRequest(data);

      expect(service.createRequest).toHaveBeenCalledWith(
        { eventId: mockRequest.eventId },
        mockRequest.userId,
      );
      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: '보상 요청이 성공적으로 생성되었습니다.',
        data: expect.objectContaining({
          requestId: mockRequest._id,
          eventId: mockRequest.eventId,
          userId: mockRequest.userId,
          status: mockRequest.status,
          createdAt: mockRequest.createdAt,
          updatedAt: mockRequest.updatedAt,
        }),
        timestamp: expect.any(String),
      });
    });

    it('should handle GET /requests/:requestId', async () => {
      const data = {
        path: 'requests/test-request-id',
        method: 'GET',
        body: {
          body: {},
          headers: {},
          query: {},
          params: {},
        },
      };

      service.findRequestById.mockResolvedValue(mockRequest);

      const result = await gateway.handleRequest(data);

      expect(service.findRequestById).toHaveBeenCalledWith('test-request-id');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '요청을 성공적으로 조회했습니다.',
        data: expect.objectContaining({
          requestId: mockRequest._id,
          eventId: mockRequest.eventId,
          userId: mockRequest.userId,
          status: mockRequest.status,
          createdAt: mockRequest.createdAt,
          updatedAt: mockRequest.updatedAt,
        }),
        timestamp: expect.any(String),
      });
    });

    it('should throw NotFoundException for unknown path', async () => {
      const data = {
        path: 'unknown',
        method: 'GET',
        body: {
          body: {},
          headers: {},
          query: {},
          params: {},
        },
      };

      await expect(gateway.handleRequest(data)).rejects.toThrow(
        new NotFoundException('Cannot GET /unknown'),
      );
    });
  });
});
