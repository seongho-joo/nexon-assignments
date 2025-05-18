import { ApiProperty } from '@nestjs/swagger';
import { RewardDto } from './reward.dto';
import { EventStatus } from '@app/common/schemas';

export class EventResponseDto {
  @ApiProperty({ description: '이벤트 ID' })
  eventId: string;

  @ApiProperty({ description: '이벤트 제목' })
  title: string;

  @ApiProperty({ description: '이벤트 설명' })
  description: string;

  @ApiProperty({ description: '이벤트 시작 일자' })
  startDate: Date;

  @ApiProperty({ description: '이벤트 종료 일자' })
  endDate: Date;

  @ApiProperty({ description: '이벤트 상태', enum: EventStatus })
  status: EventStatus;

  @ApiProperty({ description: '이벤트 생성자 ID' })
  createdBy: string;

  @ApiProperty({ description: '이벤트 활성화 여부' })
  isActive: boolean;

  @ApiProperty({ description: '이벤트 보상 목록', type: [RewardDto] })
  rewards: RewardDto[];
}

export class EventRewardsResponseDto {
  @ApiProperty({ description: '이벤트 ID' })
  eventId: string;

  @ApiProperty({ description: '이벤트 보상 목록', type: [RewardDto] })
  rewards: RewardDto[];
}

export class EventListResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  events: EventResponseDto[];
} 