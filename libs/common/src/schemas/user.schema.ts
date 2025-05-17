import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ulid } from 'ulid';

export enum UserRole {
  USER = 'user',
  OPERATOR = 'operator',
  AUDITOR = 'auditor',
  ADMIN = 'admin',
}

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User extends Document {
  /** 사용자 고유 ID */
  @Prop({
    type: String,
    default: () => ulid(),
    unique: true,
    index: true,
  })
  userId: string;

  /** 로그인용 사용자 이름 */
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
  })
  username: string;

  /** 비밀번호 */
  @Prop({
    type: String,
    required: true,
  })
  password: string;

  /** 재화 포인트 */
  @Prop({
    type: Number,
    default: 0,
  })
  balance: number;

  /** 사용자 역할 목록 */
  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  })
  role: UserRole;

  /** 활성 상태 */
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  /** 마지막 로그인 시각 */
  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ username: 1 }, { unique: true });
