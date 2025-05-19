import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { RewardCondition, RewardConditionType } from '@app/common/schemas';

export class RewardConditionDto {
  @Expose()
  @Transform(({ obj }) => obj.id)
  @ApiProperty({
    description: '조건 ID',
    example: '507f1f77bcf86cd799439011',
  })
  conditionId: string;

  @Expose()
  @ApiProperty({
    description: '조건 유형',
    enum: RewardConditionType,
    example: RewardConditionType.LOGIN,
  })
  @IsEnum(RewardConditionType)
  @IsNotEmpty()
  type: RewardConditionType;

  @Expose()
  @ApiProperty({
    description: '목표 값',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  targetValue: number;

  @Expose()
  @ApiProperty({
    description: '조건 설명',
    example: '첫 로그인',
  })
  @IsString()
  description: string;

  @Expose()
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
