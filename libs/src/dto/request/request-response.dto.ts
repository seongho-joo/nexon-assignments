import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { RequestStatus } from '@app/common/schemas';

export class RequestResponseDto {
  @Expose()
  @Transform(({ obj }) => obj.id)
  @ApiProperty({ description: '요청 ID' })
  requestId: string;

  @Expose()
  @ApiProperty({ description: '이벤트 ID' })
  eventId: string;

  @Expose()
  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @Expose()
  @ApiProperty({ description: '요청 상태', enum: RequestStatus })
  status: RequestStatus;

  @Expose()
  @ApiProperty({ description: '요청 생성 일자' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: '요청 업데이트 일자' })
  updatedAt: Date;
}
