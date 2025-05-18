import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ulid } from 'ulid';

export enum RewardConditionType {
  LOGIN = 'LOGIN', // 로그인
  PLAY_TIME = 'PLAY_TIME', // 플레이 시간
  ACHIEVEMENT = 'ACHIEVEMENT', // 업적 달성
  LEVEL = 'LEVEL', // 레벨 달성
  ITEM_COLLECT = 'ITEM_COLLECT', // 아이템 수집
  CUSTOM = 'CUSTOM', // 커스텀 조건
}

export class RewardCondition {
  /** 조건 유형 (예: 로그인, 플레이 시간, 업적 달성 등) */
  @Prop({
    type: String,
    enum: Object.values(RewardConditionType),
    required: true,
  })
  type: RewardConditionType;

  /** 목표 값 (예: 특정 횟수나 시간) */
  @Prop({
    type: Number,
    default: 1,
    min: 1,
  })
  targetValue: number;

  /** 조건 설명 */
  @Prop({
    type: String,
    default: '',
  })
  description: string;

  /** 추가 파라미터 (유연한 설정) */
  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: {},
  })
  additionalParams: Record<string, any>;
}

// 보상 정보 타입
export class Reward {
  /** 보상 이름 */
  @Prop({
    type: String,
    required: true,
  })
  name: string;

  /** 보상으로 지급될 포인트 */
  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  rewardPoint: number;

  /** 보상 설명 */
  @Prop({
    type: String,
    default: '',
  })
  description: string;

  /** 보상 조건 상세 정보 */
  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  condition: RewardCondition;
}

// 이벤트 상태
export enum EventStatus {
  DRAFT = 'DRAFT', // 작성 중
  SCHEDULED = 'SCHEDULED', // 예정됨
  ACTIVE = 'ACTIVE', // 활성화
  ENDED = 'ENDED', // 종료됨
  CANCELLED = 'CANCELLED', // 취소됨
}

@Schema({
  timestamps: true,
  collection: 'events',
})
export class Event extends Document {
  /** 이벤트 고유 ID */
  @Prop({
    type: String,
    default: () => ulid(),
    unique: true,
    index: true,
  })
  eventId: string;

  /** 이벤트 제목 */
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title: string;

  /** 이벤트 설명 */
  @Prop({
    type: String,
    required: true,
  })
  description: string;

  /** 이벤트 시작 일자 */
  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  /** 이벤트 종료 일자 */
  @Prop({
    type: Date,
    required: true,
  })
  endDate: Date;

  /** 이벤트 상태 */
  @Prop({
    type: String,
    enum: Object.values(EventStatus),
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  /** 지급할 보상 목록 */
  @Prop({
    type: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        rewardPoint: { type: Number, required: true },
        condition: {
          type: {
            type: String,
            enum: RewardConditionType,
            required: true,
          },
          targetValue: { type: Number, required: true },
          description: { type: String, required: true },
          additionalParams: { type: Object },
        },
      },
    ],
    default: [],
  })
  rewards: Reward[];

  /** 이벤트 생성자 (사용자 ID) */
  @Prop({
    type: String,
    ref: 'User',
    required: true,
  })
  createdBy: string;

  /** 이벤트 활성화 여부 */
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ status: 1 });
