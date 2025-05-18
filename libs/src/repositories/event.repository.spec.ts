/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventRepository } from '@app/common/repositories/event.repository';
import { Event, EventStatus } from '@app/common/schemas';
import { CustomLoggerService } from '@app/common/logger';

type MockModel = {
  create: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  find: jest.Mock;
  exec: jest.Mock;
};

describe('EventRepository', () => {
  let repository: EventRepository;

  const mockEventModel: MockModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
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
        EventRepository,
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    repository = module.get<EventRepository>(EventRepository);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockEventModel.findById.mockReturnValue({ exec: mockEventModel.exec });
    mockEventModel.findByIdAndUpdate.mockReturnValue({ exec: mockEventModel.exec });
    mockEventModel.find.mockReturnValue({ exec: mockEventModel.exec });
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const createParams = {
        title: '테스트 이벤트',
        description: '테스트 이벤트입니다.',
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-04-20'),
        createdBy: 'test-user-id',
        status: EventStatus.DRAFT,
        isActive: true,
        rewards: [],
      };

      const mockEvent = { eventId: 'test-event-id', ...createParams };
      mockEventModel.create.mockResolvedValue(mockEvent);

      const result = await repository.create(createParams);

      expect(result).toBe(mockEvent);
      expect(mockEventModel.create).toHaveBeenCalledWith(createParams);
    });
  });

  describe('findById', () => {
    it('should find event by ID', async () => {
      const mockEvent = {
        eventId: 'test-event-id',
        title: '테스트 이벤트',
      };
      mockEventModel.findById().exec.mockResolvedValue(mockEvent);

      const result = await repository.findById('test-event-id');

      expect(result).toBe(mockEvent);
      expect(mockEventModel.findById).toHaveBeenCalledWith('test-event-id');
    });

    it('should return null when event not found', async () => {
      mockEventModel.findById().exec.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update event', async () => {
      const eventId = 'test-event-id';
      const updateData = { status: EventStatus.ACTIVE };
      const mockUpdatedEvent = {
        eventId,
        title: '테스트 이벤트',
        status: EventStatus.ACTIVE,
      };

      mockEventModel.findByIdAndUpdate().exec.mockResolvedValue(mockUpdatedEvent);

      const result = await repository.update(eventId, updateData);

      expect(result).toBe(mockUpdatedEvent);
      expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalledWith(
        eventId,
        updateData,
        { new: true },
      );
    });

    it('should return null when event not found', async () => {
      mockEventModel.findByIdAndUpdate().exec.mockResolvedValue(null);

      const result = await repository.update('nonexistent', { status: EventStatus.ACTIVE });

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all active events', async () => {
      const mockEvents = [
        { eventId: 'event-1', title: '이벤트 1', isActive: true },
        { eventId: 'event-2', title: '이벤트 2', isActive: true },
      ];
      mockEventModel.find().exec.mockResolvedValue(mockEvents);

      const result = await repository.findAll();

      expect(result).toBe(mockEvents);
      expect(mockEventModel.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('findByStatus', () => {
    it('should find events by status', async () => {
      const mockEvents = [
        { eventId: 'event-1', title: '이벤트 1', status: EventStatus.ACTIVE, isActive: true },
        { eventId: 'event-2', title: '이벤트 2', status: EventStatus.ACTIVE, isActive: true },
      ];
      mockEventModel.find().exec.mockResolvedValue(mockEvents);

      const result = await repository.findByStatus(EventStatus.ACTIVE);

      expect(result).toBe(mockEvents);
      expect(mockEventModel.find).toHaveBeenCalledWith({
        status: EventStatus.ACTIVE,
        isActive: true,
      });
    });
  });
}); 