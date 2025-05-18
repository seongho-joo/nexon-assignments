import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { RewardDto } from './reward.dto';

export class CreateEventDto {
  @ApiProperty({
    description: '이벤트 제목',
    example: '신규 유저 웰컴 이벤트',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '이벤트 설명',
    example: '신규 유저를 위한 특별 보상 이벤트입니다.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: '이벤트 시작 일자',
    example: '2024-03-20T00:00:00Z',
  })
  @IsDateString()
  startDate: Date;

  @ApiProperty({
    description: '이벤트 종료 일자',
    example: '2024-04-20T23:59:59Z',
  })
  @IsDateString()
  endDate: Date;

  @ApiProperty({
    description: '초기 보상 목록',
    type: [RewardDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RewardDto)
  rewards?: RewardDto[];
} 