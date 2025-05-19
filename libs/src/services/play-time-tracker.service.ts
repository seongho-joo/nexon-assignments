import { Injectable, OnModuleInit } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger';
import { RedisService } from '@app/common/redis';
import { RedisEnum } from '@app/common/redis/redis.enum';

@Injectable()
export class PlayTimeTrackerService implements OnModuleInit {
  private readonly PLAY_TIME_SESSION_START_KEY_PREFIX = RedisEnum.PLAY_TIME_SESSION_START.key + ':';

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('PlayTimeTrackerService');
  }

  async onModuleInit() {
    // 주기적으로 실행되는 플레이 타임 업데이트 작업 설정
    setInterval(() => this.updateAllActiveSessions(), 60000); // 10초마다 실행
  }

  async startSession(userId: string): Promise<void> {
    const sessionStartKey = this.getSessionStartKey(userId);
    const currentTime = Date.now();

    await this.redisService.set(sessionStartKey, currentTime);
    this.logger.log(`Started session for user ${userId}`);
  }

  async endSession(userId: string): Promise<number> {
    const sessionStartKey = this.getSessionStartKey(userId);
    const playTimeKey = this.getPlayTimeKey(userId);

    const sessionStart = await this.redisService.get<string>(sessionStartKey);
    if (!sessionStart) {
      return 0;
    }

    const currentTime = Date.now();
    const sessionDuration = Math.floor((currentTime - Number(sessionStart ?? 0)) / 60000);

    await this.redisService.increment(playTimeKey, sessionDuration);
    await this.redisService.delete(sessionStartKey);

    this.logger.log(`Ended session for user ${userId}, duration: ${sessionDuration} minutes`);

    return sessionDuration;
  }

  async getPlayTime(userId: string): Promise<number> {
    const playTimeKey = this.getPlayTimeKey(userId);
    const playTime = await this.redisService.get<string>(playTimeKey);
    return Number(playTime ?? 0);
  }

  private async updateAllActiveSessions(): Promise<void> {
    this.logger.debug('updateAllActiveSessions 진입');
    const lockKey = 'lock:playtime:update';
    const lockValue = Date.now().toString();
    const acquired = await new Promise<boolean>((resolve, reject) => {
      this.redisService.redisNativeClient.set(
        lockKey,
        lockValue,
        'NX',
        'PX',
        63000,
        (err, reply) => {
          if (err) return reject(err);
          resolve(reply === 'OK');
        },
      );
    });
    if (!acquired) {
      this.logger.warn('setnx 락 획득 실패, 다른 인스턴스가 집계 중일 수 있음');
      return;
    }
    this.logger.debug('setnx 락 획득 성공');
    try {
      const pattern = `${this.PLAY_TIME_SESSION_START_KEY_PREFIX}*`;
      const sessionKeys = await this.redisService.scan(pattern, 100);
      for (const sessionKey of sessionKeys) {
        const userId = sessionKey.replace(this.PLAY_TIME_SESSION_START_KEY_PREFIX, '');
        const sessionStart = await this.redisService.get<string>(sessionKey);

        if (sessionStart) {
          const currentTime = Date.now();
          const sessionDuration = Math.floor((currentTime - Number(sessionStart ?? 0)) / 60000);

          await this.redisService.set(sessionKey, currentTime);

          const playTimeKey = this.getPlayTimeKey(userId);
          await this.redisService.increment(playTimeKey, sessionDuration);

          this.logger.log(`Updated play time for user ${userId}: +${sessionDuration} minutes`);
        }
      }
    } finally {
      await new Promise<void>((resolve, reject) => {
        this.redisService.redisNativeClient.del(lockKey, err => {
          if (err) return reject(err);
          this.logger.debug('setnx 락 해제 완료');
          resolve();
        });
      });
    }
  }

  private getSessionStartKey(userId: string): string {
    return `${this.PLAY_TIME_SESSION_START_KEY_PREFIX}${userId}`;
  }

  private getPlayTimeKey(userId: string): string {
    const { key } = RedisEnum.PLAY_TIME.getKeyAndTTL(userId);
    return key;
  }
}
