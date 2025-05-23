import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { UserService } from '@app/common/services/user.service';
import { BaseResponseDto, GatewayCommandEnum } from '@app/common/dto';
import {
  LoginRequestDto,
  LoginResponseDto,
  SignUpQueryDto,
  SignUpRequestDto,
  SignUpResponseDto,
} from '@app/common/dto/user';
import { AuthService } from '@app/common/services/auth.service';
import {
  GetRolePermissionsDto,
  RolePermissionsResponseDto,
  SetRolePermissionDto,
} from '@app/common/dto/role/role-permission.dto';
import { User } from '@app/common/schemas';
import { UpdateUserRoleDto } from '@app/common/dto/role';
import { BadRequestException, NotFoundException } from '@app/common/exceptions';

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
    private readonly authService: AuthService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('AuthGateway');
  }

  @MessagePattern({ cmd: GatewayCommandEnum.AUTH })
  async handleProxyRequest(data: ProxyPayload): Promise<BaseResponseDto<unknown>> {
    this.logger.log(`Received proxy request for path: ${data.path}`);

    if (!data.body) {
      throw new RpcException(new BadRequestException('Invalid request body'));
    }

    switch (data.path) {
      case 'sign-up':
        return this.handleSignUp(data);
      case 'login':
        return this.handleLogin(data);
      case 'logout':
        return this.handleLogout(data);
      case 'role-permissions':
        return this.handleRolePermissions(data);
      case 'user-role':
        return this.handleUpdateUserRole(data);
      default:
        throw new NotFoundException(`Cannot handle path: ${data.path}`);
    }
  }

  private async handleSignUp(data: ProxyPayload): Promise<BaseResponseDto<SignUpResponseDto>> {
    if (!data.body || !data.body.body) {
      throw new RpcException(new BadRequestException('Invalid request body'));
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

  private async handleLogin(data: ProxyPayload): Promise<BaseResponseDto<LoginResponseDto>> {
    if (!data.body || !data.body.body) {
      throw new RpcException(new BadRequestException('Invalid request body'));
    }

    const { username, password } = data.body.body as LoginRequestDto;

    const result = await this.authService.login(username, password);

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleLogout(data: ProxyPayload): Promise<BaseResponseDto<void>> {
    if (!data.body || !data.body.body) {
      throw new RpcException(new BadRequestException('Invalid request body'));
    }

    const { userId } = data.body.body as { userId: string };
    await this.authService.logout(userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Logout successful',
      data: undefined,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleRolePermissions(data: ProxyPayload): Promise<BaseResponseDto<unknown>> {
    if (!data.body) {
      throw new RpcException(new BadRequestException('Invalid request body'));
    }

    switch (data.method) {
      case 'POST':
        return this.setRolePermission(data.body.body as SetRolePermissionDto);
      case 'GET':
        return this.getRolePermissions(data.body.query as GetRolePermissionsDto);
      case 'DELETE':
        return this.removeRolePermission(data.body.body as SetRolePermissionDto);
      default:
        throw new RpcException(new BadRequestException('Invalid method'));
    }
  }

  private async setRolePermission(dto: SetRolePermissionDto): Promise<BaseResponseDto<void>> {
    await this.authService.setRolePermission(dto);

    return {
      statusCode: HttpStatus.OK,
      message: `Role permission ${dto.allow ? 'added' : 'removed'} successfully`,
      data: undefined,
      timestamp: new Date().toISOString(),
    };
  }

  private async getRolePermissions(
    dto: GetRolePermissionsDto,
  ): Promise<BaseResponseDto<RolePermissionsResponseDto>> {
    const permissions = await this.authService.getRolePermissions(dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Role permissions retrieved successfully',
      data: permissions,
      timestamp: new Date().toISOString(),
    };
  }

  private async removeRolePermission(dto: SetRolePermissionDto): Promise<BaseResponseDto<void>> {
    await this.authService.removeRolePermission(dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Role permission removed successfully',
      data: undefined,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleUpdateUserRole(data: ProxyPayload): Promise<BaseResponseDto<User>> {
    if (!data.body || !data.body.body) {
      throw new RpcException(new BadRequestException('Invalid request body'));
    }

    const { userId, newRole } = data.body.body as UpdateUserRoleDto;
    const user = await this.userService.updateRole(userId, newRole);

    return {
      statusCode: HttpStatus.OK,
      message: 'User role updated successfully',
      data: user,
      timestamp: new Date().toISOString(),
    };
  }
}
