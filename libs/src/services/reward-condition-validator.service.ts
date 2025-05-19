import { Injectable } from '@nestjs/common';
import { RewardConditionType, RewardCondition } from '@app/common/schemas';
import { CustomLoggerService } from '@app/common/logger';
import { RedisService } from '@app/common/redis';
import { RedisEnum } from '@app/common/redis/redis.enum';
import { RpcException } from '@nestjs/microservices';
import { UnexpectedException } from '@app/common/exceptions/unexpected-exception';

type ValidateInfo = { isValid: boolean; reason?: string };

@Injectable()
export class RewardConditionValidatorService {
  constructor(
    private readonly logger: CustomLoggerService,
    private readonly redisService: RedisService,
  ) {
    this.logger.setContext('RewardConditionValidatorService');
  }

  async validateCondition(condition: RewardCondition, userId: string): Promise<ValidateInfo> {
    this.logger.log(`Validating condition type ${condition.type} for user ${userId}`);

    switch (condition.type) {
      case RewardConditionType.LOGIN:
        return this.validateLoginCondition(condition, userId);
      case RewardConditionType.PLAY_TIME:
        return this.validatePlayTimeCondition(condition, userId);
      default:
        throw new RpcException(new UnexpectedException('Unknown condition type'));
    }
  }

  private async validateLoginCondition(
    condition: RewardCondition,
    userId: string,
  ): Promise<ValidateInfo> {
    const { key } = RedisEnum.CONTINUOUS_LOGIN_COUNT.getKeyAndTTL(userId);
    const loginCount = await this.redisService.get<string>(key);
    const isValid = Number(loginCount ?? 0) >= condition.targetValue;

    return {
      isValid,
      reason: isValid
        ? undefined
        : `로그인 횟수가 부족합니다. (현재: ${loginCount}, 목표: ${condition.targetValue})`,
    };
  }

  private async validatePlayTimeCondition(
    condition: RewardCondition,
    userId: string,
  ): Promise<ValidateInfo> {
    const { key } = RedisEnum.PLAY_TIME.getKeyAndTTL(userId);
    const playTimeMinutes = await this.redisService.get<string>(key);
    const isValid = Number(playTimeMinutes ?? 0) >= condition.targetValue;

    return {
      isValid,
      reason: isValid
        ? undefined
        : `플레이 시간이 부족합니다. (현재: ${playTimeMinutes}분, 목표: ${condition.targetValue}분)`,
    };
  }
}
