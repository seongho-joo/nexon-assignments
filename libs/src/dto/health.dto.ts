import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceNameEnum } from '@app/common/dto/common.enum';

export class ServiceStatusDto {
  @ApiProperty({
    description: '서비스 상태 (ok 또는 error)',
    example: 'ok',
    enum: ['ok', 'error'],
  })
  status: string;

  @ApiPropertyOptional({
    description: '오류 발생 시 세부 정보',
    example: 'Connection refused',
  })
  details?: string;
}

export class ServicesDto {
  @ApiPropertyOptional({ type: ServiceStatusDto })
  mongodb?: ServiceStatusDto;

  @ApiPropertyOptional({ type: ServiceStatusDto })
  redis?: ServiceStatusDto;

  @ApiPropertyOptional({ type: ServiceStatusDto })
  auth?: ServiceStatusDto;

  @ApiPropertyOptional({ type: ServiceStatusDto })
  event?: ServiceStatusDto;
}

export class HealthResponseDto {
  @ApiProperty({
    description: '전체 상태',
    example: 'ok',
    enum: ['ok', 'error'],
  })
  status: string;

  @ApiProperty({
    description: '서비스별 상태',
    type: ServicesDto,
  })
  services: ServicesDto;
}

export class PingResponseDto {
  @ApiProperty({
    description: '서비스 상태',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: '현재 timestamp',
    example: '2023-05-17T05:45:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '서비스 이름',
    enum: ServiceNameEnum,
    example: ServiceNameEnum.GATEWAY,
  })
  service: ServiceNameEnum;
}
