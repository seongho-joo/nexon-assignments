/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RedisClient } from 'redis';
import { RedisService } from './redis.service';
import { CustomLoggerService } from '@app/common/logger';

describe('RedisService', () => {
  let service: RedisService;
  let cacheManager: jest.Mocked<Cache>;
  let redisClient: jest.Mocked<RedisClient>;
  let logger: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    const mockCacheManager = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      store: {
        getClient: jest.fn(),
      },
    };

    const mockRedisClient = {
      expire: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      sismember: jest.fn(),
      srem: jest.fn(),
      scard: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      error: jest.fn(),
    };

    mockCacheManager.store.getClient.mockReturnValue(mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    cacheManager = module.get(CACHE_MANAGER);
    redisClient = mockCacheManager.store.getClient();
    logger = module.get(CustomLoggerService);
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

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, { ttl });
    });

    it('should throw error when cacheManager.set fails', async () => {
      const error = new Error('Test error');
      (cacheManager.set as jest.Mock).mockRejectedValueOnce(error);

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
      (cacheManager.get as jest.Mock).mockRejectedValueOnce(error);

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
      (cacheManager.del as jest.Mock).mockRejectedValueOnce(error);

      await expect(service.delete('key')).rejects.toThrow(error);
    });
  });

  describe('setTTL', () => {
    it('should call client.expire with correct parameters', async () => {
      const key = 'testKey';
      const ttl = 3600;

      redisClient.expire.mockImplementation((k, t, callback) => {
        callback(null, 1);
        return redisClient;
      });

      await service.setTTL(key, ttl);

      expect(redisClient.expire).toHaveBeenCalled();
      const [calledKey, calledTTL] = redisClient.expire.mock.calls[0];
      expect(calledKey).toBe(key);
      expect(calledTTL).toBe(ttl);
    });

    it('should throw error when client.expire fails', async () => {
      const error = new Error('Test error');
      redisClient.expire.mockImplementation((k, t, callback) => {
        callback(error);
        return redisClient;
      });

      await expect(service.setTTL('key', 3600)).rejects.toThrow(error);
    });
  });

  describe('Set operations', () => {
    describe('sAdd', () => {
      it('should add members to a set', async () => {
        const key = 'testSet';
        const members = ['member1', 'member2'];

        redisClient.sadd.mockImplementation((k, m, callback) => {
          callback(null, 2);
          return redisClient;
        });

        const result = await service.sAdd(key, ...members);

        expect(redisClient.sadd).toHaveBeenCalled();
        const [calledKey, calledMembers] = redisClient.sadd.mock.calls[0];
        expect(calledKey).toBe(key);
        expect(calledMembers).toEqual(members);
        expect(result).toBe(2);
      });

      it('should throw error when sadd fails', async () => {
        const error = new Error('Test error');
        redisClient.sadd.mockImplementation((k, m, callback) => {
          callback(error);
          return redisClient;
        });

        await expect(service.sAdd('key', 'member')).rejects.toThrow(error);
      });
    });

    describe('sMembers', () => {
      it('should return all members of a set', async () => {
        const key = 'testSet';
        const expectedMembers = ['member1', 'member2'];

        redisClient.smembers.mockImplementation((k, callback) => {
          callback(null, expectedMembers);
          return redisClient;
        });

        const result = await service.sMembers(key);

        expect(redisClient.smembers).toHaveBeenCalled();
        const [calledKey] = redisClient.smembers.mock.calls[0];
        expect(calledKey).toBe(key);
        expect(result).toEqual(expectedMembers);
      });

      it('should throw error when smembers fails', async () => {
        const error = new Error('Test error');
        redisClient.smembers.mockImplementation((k, callback) => {
          callback(error);
          return redisClient;
        });

        await expect(service.sMembers('key')).rejects.toThrow(error);
      });
    });

    describe('sIsMember', () => {
      it('should check if member exists in a set', async () => {
        const key = 'testSet';
        const member = 'member1';

        redisClient.sismember.mockImplementation((k, m, callback) => {
          callback(null, 1);
          return redisClient;
        });

        const result = await service.sIsMember(key, member);

        expect(redisClient.sismember).toHaveBeenCalled();
        const [calledKey, calledMember] = redisClient.sismember.mock.calls[0];
        expect(calledKey).toBe(key);
        expect(calledMember).toBe(member);
        expect(result).toBe(true);
      });

      it('should throw error when sismember fails', async () => {
        const error = new Error('Test error');
        redisClient.sismember.mockImplementation((k, m, callback) => {
          callback(error);
          return redisClient;
        });

        await expect(service.sIsMember('key', 'member')).rejects.toThrow(error);
      });
    });

    describe('sRem', () => {
      it('should remove members from a set', async () => {
        const key = 'testSet';
        const members = ['member1', 'member2'];

        redisClient.srem.mockImplementation((k, m, callback) => {
          callback(null, 1);
          return redisClient;
        });

        const result = await service.sRem(key, ...members);

        expect(redisClient.srem).toHaveBeenCalled();
        const [calledKey, calledMembers] = redisClient.srem.mock.calls[0];
        expect(calledKey).toBe(key);
        expect(calledMembers).toEqual(members);
        expect(result).toBe(1);
      });

      it('should throw error when srem fails', async () => {
        const error = new Error('Test error');
        redisClient.srem.mockImplementation((k, m, callback) => {
          callback(error);
          return redisClient;
        });

        await expect(service.sRem('key', 'member')).rejects.toThrow(error);
      });
    });

    describe('sCard', () => {
      it('should return the number of members in a set', async () => {
        const key = 'testSet';

        redisClient.scard.mockImplementation((k, callback) => {
          callback(null, 3);
          return redisClient;
        });

        const result = await service.sCard(key);

        expect(redisClient.scard).toHaveBeenCalled();
        const [calledKey] = redisClient.scard.mock.calls[0];
        expect(calledKey).toBe(key);
        expect(result).toBe(3);
      });

      it('should throw error when scard fails', async () => {
        const error = new Error('Test error');
        redisClient.scard.mockImplementation((k, callback) => {
          callback(error);
          return redisClient;
        });

        await expect(service.sCard('key')).rejects.toThrow(error);
      });
    });
  });
});
