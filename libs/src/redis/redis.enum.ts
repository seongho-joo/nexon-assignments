export interface RedisKeyAndTTL {
  key: string;
  ttl: number;
}

export enum RedisDataStructureEnum {
  STRING = 'string',
  LIST = 'list',
  SET = 'set',
  SORTED_SET = 'zset',
  HASH = 'hash',
  JSON = 'json',
  GEO = 'geo',
}

enum RedisTTLEnum {
  MINUTE = 60,
  HOUR = 3600,
  DAY = 86400,
  WEEK = 604800,
  MONTH = 2592000,
  YEAR = 31536000,
  FOREVER = -1,
}

export class RedisEnum {
  static readonly AUTH_TOKEN = new RedisEnum(
    RedisDataStructureEnum.STRING,
    'auth:token',
    RedisTTLEnum.DAY,
  );

  static readonly AUTHORIZATION_ROLE = new RedisEnum(
    RedisDataStructureEnum.SET,
    'authorization',
    RedisTTLEnum.FOREVER,
  );

  static readonly CONTINUOUS_LOGIN_AT = new RedisEnum(
    RedisDataStructureEnum.STRING,
    'condition:continuous_login:at',
    RedisTTLEnum.DAY,
  );

  static readonly CONTINUOUS_LOGIN_COUNT = new RedisEnum(
    RedisDataStructureEnum.STRING,
    'condition:continuous_login:count',
    RedisTTLEnum.DAY,
  );

  static readonly PLAY_TIME = new RedisEnum(
    RedisDataStructureEnum.STRING,
    'condition:play_time',
    RedisTTLEnum.FOREVER,
  );

  static readonly PLAY_TIME_SESSION_START = new RedisEnum(
    RedisDataStructureEnum.STRING,
    'condition:play_time:session_start',
    RedisTTLEnum.FOREVER,
  );

  private constructor(
    public readonly dataType: string,
    public readonly key: string,
    public readonly ttl: number,
  ) {}

  getKeyAndTTL(suffix?: string): RedisKeyAndTTL {
    let key = this.key;
    if (suffix) {
      key = `${this.key}:${suffix}`;
    }
    return {
      key,
      ttl: this.ttl,
    };
  }
}
