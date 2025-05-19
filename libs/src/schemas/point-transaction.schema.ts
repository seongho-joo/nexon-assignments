import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PointTransactionDocument = PointTransaction & Document;

export enum PointTransactionType {
  /** 이벤트 보상 적립 */
  EVENT_REWARD = 'EVENT_REWARD',
  /** 어드민 직접 지급 */
  ADMIN_GRANT = 'ADMIN_GRANT',
  /** 포인트 사용(차감) */
  REDEMPTION = 'REDEMPTION',
}

@Schema({ timestamps: { createdAt: 'timestamp', updatedAt: false } })
export class PointTransaction extends Document {
  /** 회원 고유 ID */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** 거래로 인한 포인트 증감량(+/-) */
  @Prop({ type: Number, required: true })
  amount: number;

  /** 거래 유형 */
  @Prop({ type: String, enum: PointTransactionType, required: true })
  type: PointTransactionType;

  /** 관련 이벤트 ID (이벤트 보상 시) */
  @Prop({ type: Types.ObjectId, ref: 'Event', required: false })
  eventId?: Types.ObjectId;

  /** 관련 보상 요청 ID (리워드 사용 시) */
  @Prop({ type: Types.ObjectId, ref: 'RewardRequest', required: false })
  rewardRequestId?: Types.ObjectId;

  /** 현재 거래 후 잔액 */
  @Prop({ type: Number, required: true })
  balanceAfter: number;

  /** 거래 후 남은 포인트 (FIFO 처리 시) */
  @Prop({ type: Number })
  remaining?: number;

  /** 거래 발생 시각 */
  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  /** 비고 또는 상세 설명 */
  @Prop({ type: String })
  description?: string;
}

export const PointTransactionSchema = SchemaFactory.createForClass(PointTransaction);
// 회원별 조회, 최신 내역 정렬을 위한 인덱스
PointTransactionSchema.index({ userId: 1, timestamp: -1 });
// FIFO 처리를 위한 인덱스
PointTransactionSchema.index({ userId: 1, type: 1, timestamp: 1 });
