import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { RewardDto } from './reward.dto';
import { EventStatus } from '@app/common/schemas';

export class EventResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  @ApiProperty({ description: '이벤트 ID' })
  eventId: string;

  @Expose()
  @ApiProperty({ description: '이벤트 제목' })
  title: string;

  @Expose()
  @ApiProperty({ description: '이벤트 설명' })
  description: string;

  @Expose()
  @ApiProperty({ description: '이벤트 시작 일자' })
  startDate: Date;

  @Expose()
  @ApiProperty({ description: '이벤트 종료 일자' })
  endDate: Date;

  @Expose()
  @ApiProperty({ description: '이벤트 상태', enum: EventStatus })
  status: EventStatus;

  @Expose()
  @ApiProperty({ description: '이벤트 생성자 ID' })
  createdBy: string;

  @Expose()
  @ApiProperty({ description: '이벤트 활성화 여부' })
  isActive: boolean;

  @Expose()
  @Type(() => RewardDto)
  @ApiProperty({ description: '이벤트 보상 목록', type: [RewardDto] })
  rewards: RewardDto[];

  @Expose()
  @ApiProperty({ description: '생성 일자' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: '수정 일자' })
  updatedAt: Date;
}

export class EventRewardsResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  @ApiProperty({ description: '이벤트 ID' })
  eventId: string;

  @Expose()
  @Type(() => RewardDto)
  @ApiProperty({ description: '이벤트 보상 목록', type: [RewardDto] })
  rewards: RewardDto[];
}

export class EventListResponseDto {
  @Expose()
  @Type(() => EventResponseDto)
  @ApiProperty({ type: [EventResponseDto] })
  events: EventResponseDto[];
}
