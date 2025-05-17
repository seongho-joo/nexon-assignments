import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T = unknown> {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: '응답 메시지',
    example: 'Success',
  })
  message: string;

  @ApiProperty({
    description: '응답 데이터',
  })
  data: T;

  @ApiProperty({
    description: '응답 타임스탬프',
    example: '2024-03-17T05:45:00.000Z',
  })
  timestamp: string;
}
