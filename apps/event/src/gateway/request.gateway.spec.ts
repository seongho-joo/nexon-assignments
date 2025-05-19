import { Test, TestingModule } from '@nestjs/testing';
import { RequestGateway } from './request.gateway';
import { RequestService } from '@app/common/services/request.service';
import { CustomLoggerService } from '@app/common/logger';
import { Request, RequestStatus } from '@app/common/schemas';
import { Document } from 'mongoose';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import { GatewayCommandEnum } from '@app/common/dto';

interface ProxyPayload {
  body: any;
  query: any;
  params: any;
  headers: any;
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
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Request & Document;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestGateway,
        {
          provide: RequestService,
          useValue: {
            createRequest: jest.fn(),
            findRequestById: jest.fn(),
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

  describe('handleProxyRequest', () => {
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

      const result = await gateway.handleProxyRequest(data);

      expect(service.createRequest).toHaveBeenCalledWith(
        { eventId: mockRequest.eventId },
        mockRequest.userId,
      );
      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: '보상 요청이 성공적으로 생성되었습니다.',
        data: expect.any(Object),
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

      const result = await gateway.handleProxyRequest(data);

      expect(service.findRequestById).toHaveBeenCalledWith('test-request-id');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: '보상 요청을 성공적으로 조회했습니다.',
        data: expect.any(Object),
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

      await expect(gateway.handleProxyRequest(data)).rejects.toThrow(
        new NotFoundException('Cannot GET /unknown'),
      );
    });
  });
}); 