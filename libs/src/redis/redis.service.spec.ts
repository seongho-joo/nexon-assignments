import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisService } from '@app/common/redis/redis.service';
import { CustomLoggerService } from '@app/common/logger';

describe('RedisService', () => {
  let service: RedisService;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    store: {
      getClient: jest.Mock;
    };
  };

  let redisClient: {
    expire: jest.Mock;
    sAdd: jest.Mock;
    sMembers: jest.Mock;
    sIsMember: jest.Mock;
    sRem: jest.Mock;
    sCard: jest.Mock;
  };

  beforeEach(async () => {
    // Redis 클라이언트 메서드 모킹
    redisClient = {
      expire: jest.fn().mockResolvedValue(1),
      sAdd: jest.fn().mockResolvedValue(2),
      sMembers: jest.fn().mockResolvedValue(['member1', 'member2']),
      sIsMember: jest.fn().mockResolvedValue(true),
      sRem: jest.fn().mockResolvedValue(1),
      sCard: jest.fn().mockResolvedValue(3),
    };

    // 캐시 매니저 모킹
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      store: {
        getClient: jest.fn().mockReturnValue(redisClient),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: CustomLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should call cacheManager.set with correct parameters', async () => {
      const key = 'testKey';
      const value = { test: 'data' };
      const ttl = 3600;

      await service.set(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should throw error when cacheManager.set fails', async () => {
      const error = new Error('Test error');
      cacheManager.set.mockRejectedValueOnce(error);

      await expect(service.set('key', 'value')).rejects.toThrow(error);
    });
  });

  describe('get', () => {
    it('should return value from cache manager', async () => {
      const key = 'testKey';
      const expectedValue = { test: 'data' };
      cacheManager.get.mockResolvedValueOnce(expectedValue);

      const result = await service.get(key);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(expectedValue);
    });

    it('should return null when key does not exist', async () => {
      cacheManager.get.mockResolvedValueOnce(null);

      const result = await service.get('nonExistentKey');

      expect(result).toBeNull();
    });

    it('should throw error when cacheManager.get fails', async () => {
      const error = new Error('Test error');
      cacheManager.get.mockRejectedValueOnce(error);

      await expect(service.get('key')).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should call cacheManager.del with correct key', async () => {
      const key = 'testKey';

      await service.delete(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should throw error when cacheManager.del fails', async () => {
      const error = new Error('Test error');
      cacheManager.del.mockRejectedValueOnce(error);

      await expect(service.delete('key')).rejects.toThrow(error);
    });
  });

  describe('setTTL', () => {
    it('should call client.expire with correct parameters', async () => {
      const key = 'testKey';
      const ttl = 3600;

      await service.setTTL(key, ttl);

      expect(redisClient.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should throw error when client.expire fails', async () => {
      const error = new Error('Test error');
      redisClient.expire.mockRejectedValueOnce(error);

      await expect(service.setTTL('key', 3600)).rejects.toThrow(error);
    });
  });

  describe('Set operations', () => {
    describe('sAdd', () => {
      it('should add members to a set', async () => {
        const key = 'testSet';
        const members = ['member1', 'member2'];

        const result = await service.sAdd(key, ...members);

        expect(redisClient.sAdd).toHaveBeenCalledWith(key, members);
        expect(result).toBe(2);
      });

      it('should throw error when sAdd fails', async () => {
        const error = new Error('Test error');
        redisClient.sAdd.mockRejectedValueOnce(error);

        await expect(service.sAdd('key', 'member')).rejects.toThrow(error);
      });
    });

    describe('sMembers', () => {
      it('should return all members of a set', async () => {
        const key = 'testSet';
        const expectedMembers = ['member1', 'member2'];
        redisClient.sMembers.mockResolvedValueOnce(expectedMembers);

        const result = await service.sMembers(key);

        expect(redisClient.sMembers).toHaveBeenCalledWith(key);
        expect(result).toEqual(expectedMembers);
      });

      it('should throw error when sMembers fails', async () => {
        const error = new Error('Test error');
        redisClient.sMembers.mockRejectedValueOnce(error);

        await expect(service.sMembers('key')).rejects.toThrow(error);
      });
    });

    describe('sIsMember', () => {
      it('should check if member exists in a set', async () => {
        const key = 'testSet';
        const member = 'member1';
        redisClient.sIsMember.mockResolvedValueOnce(true);

        const result = await service.sIsMember(key, member);

        expect(redisClient.sIsMember).toHaveBeenCalledWith(key, member);
        expect(result).toBe(true);
      });

      it('should throw error when sIsMember fails', async () => {
        const error = new Error('Test error');
        redisClient.sIsMember.mockRejectedValueOnce(error);

        await expect(service.sIsMember('key', 'member')).rejects.toThrow(error);
      });
    });

    describe('sRem', () => {
      it('should remove members from a set', async () => {
        const key = 'testSet';
        const members = ['member1', 'member2'];

        const result = await service.sRem(key, ...members);

        expect(redisClient.sRem).toHaveBeenCalledWith(key, members);
        expect(result).toBe(1);
      });

      it('should throw error when sRem fails', async () => {
        const error = new Error('Test error');
        redisClient.sRem.mockRejectedValueOnce(error);

        await expect(service.sRem('key', 'member')).rejects.toThrow(error);
      });
    });

    describe('sCard', () => {
      it('should return the number of members in a set', async () => {
        const key = 'testSet';
        redisClient.sCard.mockResolvedValueOnce(3);

        const result = await service.sCard(key);

        expect(redisClient.sCard).toHaveBeenCalledWith(key);
        expect(result).toBe(3);
      });

      it('should throw error when sCard fails', async () => {
        const error = new Error('Test error');
        redisClient.sCard.mockRejectedValueOnce(error);

        await expect(service.sCard('key')).rejects.toThrow(error);
      });
    });
  });
});
