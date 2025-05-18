import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { RewardCondition, RewardConditionType } from '@app/common/schemas';

export class RewardConditionDto {
  @ApiProperty({
    description: '조건 유형',
    enum: RewardConditionType,
    example: RewardConditionType.LOGIN,
  })
  @IsEnum(RewardConditionType)
  @IsNotEmpty()
  type: RewardConditionType;

  @ApiProperty({
    description: '목표 값',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  targetValue: number;

  @ApiProperty({
    description: '조건 설명',
    example: '첫 로그인',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: '추가 파라미터',
    example: {},
    required: false,
  })
  @IsOptional()
  @IsObject()
  additionalParams?: Record<string, any>;

  toSchema(): RewardCondition {
    return {
      type: this.type,
      targetValue: this.targetValue,
      description: this.description,
      additionalParams: this.additionalParams || {},
    };
  }
}
