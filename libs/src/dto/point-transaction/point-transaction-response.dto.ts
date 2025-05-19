import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { PointTransactionType } from '@app/common/schemas';

export class PointTransactionResponseDto {
  @Expose()
  @Transform(({ obj }) => obj.id)
  @ApiProperty({
    description: '트랜잭션 ID',
    example: '507f1f77bcf86cd799439011',
  })
  transactionId: string;

  @Expose()
  @ApiProperty({
    description: '사용자 ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @Expose()
  @ApiProperty({
    description: '포인트 금액',
    example: 1000,
  })
  amount: number;

  @Expose()
  @ApiProperty({
    description: '트랜잭션 타입',
    enum: PointTransactionType,
    example: PointTransactionType.EVENT_REWARD,
  })
  type: PointTransactionType;

  @Expose()
  @ApiProperty({
    description: '트랜잭션 설명',
    example: '이벤트 보상 지급',
  })
  description: string;

  @Expose()
  @Transform(({ obj }) => obj.timestamp)
  @ApiProperty({
    description: '트랜잭션 생성 시간',
    example: '2024-03-19T12:00:00.000Z',
  })
  createdAt: Date;
}

export class PointTransactionListResponseDto {
  @ApiProperty({
    type: [PointTransactionResponseDto],
    description: '포인트 트랜잭션 목록',
  })
  transactions: PointTransactionResponseDto[];

  @ApiProperty({
    description: '총 트랜잭션 수',
    example: 10,
  })
  totalCount: number;
} 