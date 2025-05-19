import { Test, TestingModule } from '@nestjs/testing';
import { RewardConditionValidatorService } from './reward-condition-validator.service';
import { PlayTimeTrackerService } from './play-time-tracker.service';
import { CustomLoggerService } from '@app/common/logger';
import { RewardConditionType } from '@app/common/schemas';
import { RedisService } from '@app/common/redis';
import { RpcException } from '@nestjs/microservices';
import { BadRequestException } from '@nestjs/common';

describe('RewardConditionValidatorService', () => {
  let service: RewardConditionValidatorService;
  let playTimeTrackerService: jest.Mocked<PlayTimeTrackerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardConditionValidatorService,
        {
          provide: PlayTimeTrackerService,
          useValue: { getPlayTime: jest.fn() },
        },
        { provide: RedisService, useValue: { get: jest.fn() } },
        { provide: CustomLoggerService, useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn() } },
      ],
    }).compile();
    service = module.get(RewardConditionValidatorService);
    playTimeTrackerService = module.get(PlayTimeTrackerService);
  });

  it('should return isValid true if play time is enough', async () => {
    const redisService = { get: jest.fn().mockResolvedValue(600000) };
    (service as any).redisService = redisService;
    const result = await service.validateCondition({
      type: RewardConditionType.PLAY_TIME,
      targetValue: 10,
      description: '',
      additionalParams: {},
    }, 'user');
    expect(result.isValid).toBe(true);
  });

  it('should return isValid false if play time is not enough', async () => {
    const redisService = { get: jest.fn().mockResolvedValue(60000) };
    (service as any).redisService = redisService;
    const result = await service.validateCondition({
      type: RewardConditionType.PLAY_TIME,
      targetValue: 10,
      description: '',
      additionalParams: {},
    }, 'user');
    expect(result.isValid).toBe(false);
  });

  it('should throw for unknown type', async () => {
    await expect(service.validateCondition({
      type: 'UNKNOWN' as any,
      targetValue: 1,
      description: '',
      additionalParams: {},
    }, 'user')).rejects.toThrow(RpcException);
  });
}); 