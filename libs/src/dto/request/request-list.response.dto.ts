import { ApiProperty } from '@nestjs/swagger';
import { RequestResponseDto } from './request-response.dto';

export class RequestListResponseDto {
  @ApiProperty({
    type: [RequestResponseDto],
    description: '요청 목록',
  })
  requests: RequestResponseDto[];

  @ApiProperty({
    description: '총 요청 수',
    example: 10,
  })
  totalCount: number;
} 