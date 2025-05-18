import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { RewardConditionDto } from './reward-condition.dto';
import { Reward } from '@app/common/schemas';

export class RewardDto {
  @ApiProperty({
    description: '보상 이름',
    example: '첫 로그인 보상',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '보상 포인트',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  rewardPoint: number;

  @ApiProperty({
    description: '보상 설명',
    example: '첫 로그인 시 지급되는 포인트 보상입니다.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: '보상 조건',
    type: RewardConditionDto,
  })
  @ValidateNested()
  @Type(() => RewardConditionDto)
  condition: RewardConditionDto;

  toSchema(): Reward {
    return {
      name: this.name,
      rewardPoint: this.rewardPoint,
      description: this.description,
      condition: this.condition.toSchema(),
    };
  }
}
