import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ulid } from 'ulid';

export enum RequestStatus {
  PENDING = 'PENDING', // 대기 중
  APPROVED = 'APPROVED', // 승인됨
  REJECTED = 'REJECTED', // 거부됨
  COMPLETED = 'COMPLETED', // 지급 완료
  FAILED = 'FAILED', // 처리 실패
}

@Schema({
  timestamps: true,
  collection: 'requests',
})
export class Request extends Document {
  /** 보상 요청 고유 ID */
  @Prop({
    type: String,
    default: () => ulid(),
    unique: true,
    index: true,
  })
  requestId: string;

  /** 사용자 ID */
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  userId: string;

  /** 이벤트 ID */
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  eventId: string;

  /** 보상 요청 상태 */
  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  /** 거부 사유 */
  @Prop({
    type: String,
    default: '',
  })
  rejectionReason: string;

  /** 승인 시각 */
  @Prop({
    type: Date,
    default: null,
  })
  approvedAt: Date;

  /** 완료 시각 */
  @Prop({
    type: Date,
    default: null,
  })
  completedAt: Date;

  /** 추가 메타데이터 */
  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const RequestSchema = SchemaFactory.createForClass(Request);

RequestSchema.index({ userId: 1, requestId: 1, eventId: 1 }, { unique: true });
