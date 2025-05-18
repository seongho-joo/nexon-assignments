import { BadRequestException, Controller, HttpStatus, NotFoundException } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { UserService } from '@app/common/services/user.service';
import {
  BaseResponseDto,
  SignUpQueryDto,
  SignUpRequestDto,
  SignUpResponseDto,
} from '@app/common/dto';

interface ProxyPayload {
  path: string;
  method: string;
  body: {
    body: unknown;
    query: unknown;
    params: unknown;
    headers: unknown;
  };
}

@Controller()
export class AuthGateway {
  constructor(
    private readonly userService: UserService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('AuthGateway');
  }

  @MessagePattern({ cmd: 'proxy' })
  async handleProxyRequest(data: ProxyPayload): Promise<BaseResponseDto<unknown>> {
    this.logger.log(`Received proxy request for path: ${data.path}`);

    if (!data.body) {
      throw new BadRequestException('Invalid request body');
    }

    switch (data.path) {
      case 'sign-up':
        return this.handleSignUp(data);
      default:
        throw new NotFoundException(`Cannot handle path: ${data.path}`);
    }
  }

  private async handleSignUp(data: ProxyPayload): Promise<BaseResponseDto<SignUpResponseDto>> {
    if (!data.body || !data.body.body) {
      throw new BadRequestException('Invalid request body');
    }

    const { username, password, role } = data.body.body as SignUpRequestDto;
    const { adminKey } = data.body.query as SignUpQueryDto;

    const userId = await this.userService.register(username, password, role, adminKey);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
      data: new SignUpResponseDto(userId),
      timestamp: new Date().toISOString(),
    };
  }
}
