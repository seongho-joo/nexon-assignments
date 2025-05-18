import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PingResponseDto, ServiceNameEnum } from '@app/common/dto';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor() {}

  @Get()
  @ApiOperation({ summary: '인증 서버 health check' })
  @ApiOkResponse({
    description: '인증 서비스가 정상 작동 중',
    type: PingResponseDto,
  })
  getHello(): PingResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: ServiceNameEnum.AUTH,
    };
  }
}
