import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from '@app/common/schemas';

export class RequestResponseDto {
  @ApiProperty({ description: '요청 ID' })
  requestId: string;

  @ApiProperty({ description: '이벤트 ID' })
  eventId: string;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '요청 상태', enum: RequestStatus })
  status: RequestStatus;

  @ApiProperty({ description: '요청 생성 일자' })
  createdAt: Date;

  @ApiProperty({ description: '요청 업데이트 일자' })
  updatedAt: Date;
}
