import { Injectable } from '@nestjs/common';
import { RewardConditionType, RewardCondition } from '@app/common/schemas';
import { CustomLoggerService } from '@app/common/logger';
import { RedisService } from '@app/common/redis';
import { RedisEnum } from '@app/common/redis/redis.enum';

type ValidateInfo = { isValid: boolean; reason?: string };

@Injectable()
export class RewardConditionValidatorService {
  constructor(
    private readonly logger: CustomLoggerService,
    private readonly redisService: RedisService,
  ) {
    this.logger.setContext('RewardConditionValidatorService');
  }

  async validateCondition(
    condition: RewardCondition,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<ValidateInfo> {
    this.logger.log(`Validating condition type ${condition.type} for user ${userId}`);

    switch (condition.type) {
      case RewardConditionType.LOGIN:
        return this.validateLoginCondition(condition, userId);
      case RewardConditionType.PLAY_TIME:
        return this.validatePlayTimeCondition(condition, metadata);
      case RewardConditionType.LEVEL:
        return this.validateLevelCondition(condition, metadata);
      default:
        return {
          isValid: false,
          reason: `Unsupported condition type: ${condition.type}`,
        };
    }
  }

  private async validateLoginCondition(
    condition: RewardCondition,
    userId: string,
  ): Promise<ValidateInfo> {
    const { key } = RedisEnum.CONTINUOUS_LOGIN_COUNT.getKeyAndTTL(userId);
    const loginCount = (await this.redisService.get<number>(key)) ?? 0;
    const isValid = loginCount >= condition.targetValue;

    return {
      isValid,
      reason: isValid
        ? undefined
        : `로그인 횟수가 부족합니다. (현재: ${loginCount}, 목표: ${condition.targetValue})`,
    };
  }

  private validatePlayTimeCondition(
    condition: RewardCondition,
    metadata?: Record<string, any>,
  ): ValidateInfo {
    // TODO: 구현 필요
    const playTimeMinutes = metadata?.playTimeMinutes ?? 0;
    const isValid = playTimeMinutes >= condition.targetValue;

    return {
      isValid,
      reason: isValid
        ? undefined
        : `플레이 시간이 부족합니다. (현재: ${playTimeMinutes}분, 목표: ${condition.targetValue}분)`,
    };
  }

  private validateLevelCondition(
    condition: RewardCondition,
    metadata?: Record<string, any>,
  ): ValidateInfo {
    // TODO: 구현 필요
    const userLevel = metadata?.level ?? 0;
    const isValid = userLevel >= condition.targetValue;

    return {
      isValid,
      reason: isValid
        ? undefined
        : `레벨이 부족합니다. (현재: ${userLevel}, 목표: ${condition.targetValue})`,
    };
  }
}
