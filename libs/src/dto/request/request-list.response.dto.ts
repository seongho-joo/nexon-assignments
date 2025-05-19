import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RequestResponseDto } from './request-response.dto';

export class RequestListResponseDto {
  @Expose()
  @ApiProperty({
    type: [RequestResponseDto],
    description: '요청 목록',
  })
  requests: RequestResponseDto[];

  @Expose()
  @ApiProperty({
    description: '총 요청 수',
    example: 10,
  })
  totalCount: number;
} 