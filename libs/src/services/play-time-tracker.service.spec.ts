import { Test, TestingModule } from '@nestjs/testing';
import { PlayTimeTrackerService } from './play-time-tracker.service';
import { RedisService } from '@app/common/redis';
import { CustomLoggerService } from '@app/common/logger';


describe('PlayTimeTrackerService', () => {
  let service: PlayTimeTrackerService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayTimeTrackerService,
        { provide: RedisService, useValue: { set: jest.fn(), get: jest.fn(), delete: jest.fn(), increment: jest.fn() } },
        { provide: CustomLoggerService, useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn() } },
      ],
    }).compile();
    service = module.get(PlayTimeTrackerService);
    redisService = module.get(RedisService);
  });

  it('should start a session', async () => {
    await service.startSession('user');
    expect(redisService.set).toHaveBeenCalled();
  });

  it('should end a session and increment play time', async () => {
    redisService.get.mockResolvedValue(Date.now() - 1000 * 60);
    redisService.delete.mockResolvedValue(undefined);
    await service.endSession('user');
    expect(redisService.set).toHaveBeenCalled();
    expect(redisService.delete).toHaveBeenCalled();
  });

  it('should return 0 if no session exists on endSession', async () => {
    redisService.get.mockResolvedValue(null);
    const result = await service.endSession('user');
    expect(result).toBe(0);
  });

  it('should get play time', async () => {
    redisService.get.mockResolvedValue(123000);
    const result = await service.getPlayTime('user');
    expect(result).toBe(2);
  });

  it('should return 0 if no play time found', async () => {
    redisService.get.mockResolvedValue(null);
    const result = await service.getPlayTime('user');
    expect(result).toBe(0);
  });
}); 