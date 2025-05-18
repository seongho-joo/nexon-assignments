import { Injectable, OnModuleInit } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger';
import { RedisService } from '@app/common/redis';
import { RedisEnum } from '@app/common/redis/redis.enum';

@Injectable()
export class PlayTimeTrackerService implements OnModuleInit {
  private readonly PLAY_TIME_SESSION_START_KEY_PREFIX =
    RedisEnum.PLAY_TIME_SESSION_START.getKeyAndTTL(':').key;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('PlayTimeTrackerService');
  }

  async onModuleInit() {
    // 주기적으로 실행되는 플레이 타임 업데이트 작업 설정
    setInterval(() => this.updateAllActiveSessions(), 60000); // 1분마다 실행
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

    const sessionStart = (await this.redisService.get<number>(sessionStartKey)) ?? 0;
    if (!sessionStart) {
      return 0;
    }

    const currentTime = Date.now();
    const sessionDuration = Math.floor((currentTime - sessionStart) / 60000);

    await this.redisService.increment(playTimeKey, sessionDuration);
    await this.redisService.delete(sessionStartKey);

    this.logger.log(`Ended session for user ${userId}, duration: ${sessionDuration} minutes`);

    return sessionDuration;
  }

  async getPlayTime(userId: string): Promise<number> {
    const playTimeKey = this.getPlayTimeKey(userId);
    const playTime = await this.redisService.get<number>(playTimeKey);
    return playTime ?? 0;
  }

  private async updateAllActiveSessions(): Promise<void> {
    const pattern = `${this.PLAY_TIME_SESSION_START_KEY_PREFIX}*`;

    await this.redisService.scanAsync(pattern, 100, async sessionKeys => {
      for (const sessionKey of sessionKeys) {
        const userId = sessionKey.replace(this.PLAY_TIME_SESSION_START_KEY_PREFIX, '');
        const sessionStart = await this.redisService.get<number>(sessionKey);

        if (sessionStart) {
          const currentTime = Date.now();
          const sessionDuration = Math.floor((currentTime - sessionStart) / 60000);

          await this.redisService.set(sessionKey, currentTime);

          const playTimeKey = this.getPlayTimeKey(userId);
          await this.redisService.increment(playTimeKey, sessionDuration);

          this.logger.log(`Updated play time for user ${userId}: +${sessionDuration} minutes`);
        }
      }
    });
  }

  private getSessionStartKey(userId: string): string {
    return `${this.PLAY_TIME_SESSION_START_KEY_PREFIX}${userId}`;
  }

  private getPlayTimeKey(userId: string): string {
    return RedisEnum.PLAY_TIME.getKeyAndTTL(userId).key;
  }
}
