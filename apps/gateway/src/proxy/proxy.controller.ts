import {
  All,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  Query,
  Delete,
  Put,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { catchError, throwError, timeout } from 'rxjs';
import { CustomLoggerService } from '@app/common/logger';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  BaseResponseDto,
  SignUpQueryDto,
  SignUpRequestDto,
  SignUpResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  UserInfo,
} from '@app/common/dto';
import { Public, Roles, User } from '@app/common/decorators';
import { UserRole } from '@app/common/schemas';
import {
  GetRolePermissionsDto,
  RolePermissionsResponseDto,
  SetRolePermissionDto,
} from '@app/common/dto/role/role-permission.dto';
import { UpdateUserRoleDto } from '@app/common/dto/role';

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
export class ProxyController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('EVENT_SERVICE') private readonly eventClient: ClientProxy,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('ProxyController');
  }

  @Public()
  @ApiTags('Auth')
  @ApiExtraModels(BaseResponseDto, SignUpResponseDto)
  @ApiQuery({ name: 'adminKey', required: false, description: '관리자 계정을 생성하기 위한 키' })
  @ApiOperation({
    summary: '사용자 등록',
    description: '새로운 사용자를 시스템에 등록합니다.',
  })
  @ApiBody({ type: SignUpRequestDto })
  @ApiCreatedResponse({
    description: '사용자가 성공적으로 등록됨',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(SignUpResponseDto) } } },
      ],
    },
  })
  @Post('auth/sign-up')
  handleSignUp(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: SignUpRequestDto,
    @Query() query: SignUpQueryDto,
  ): void {
    void body;
    void query;
    this.routeToMicroservice('AUTH', this.authClient, 'sign-up', req, res);
  }

  @Public()
  @ApiTags('Auth')
  @ApiExtraModels(BaseResponseDto, LoginResponseDto)
  @ApiOperation({
    summary: '사용자 로그인',
    description: '사용자 인증 수행 및 JWT 토큰 발급',
  })
  @ApiBody({ type: BaseResponseDto })
  @ApiCreatedResponse({
    description: '로그인 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(LoginResponseDto) } } },
      ],
    },
  })
  @Post('auth/login')
  handleLogin(@Req() req: Request, @Res() res: Response, @Body() body: LoginRequestDto): void {
    void body;
    this.routeToMicroservice('AUTH', this.authClient, 'login', req, res);
  }

  @ApiTags('Auth')
  @ApiOperation({
    summary: '역할 권한 설정',
    description: '특정 역할에 대한 API 접근 권한을 설정합니다.',
  })
  @ApiBody({ type: SetRolePermissionDto })
  @ApiExtraModels(BaseResponseDto)
  @ApiCreatedResponse({
    description: '권한이 성공적으로 설정됨',
    schema: {
      allOf: [{ $ref: getSchemaPath(BaseResponseDto) }, { properties: { data: { type: 'null' } } }],
    },
  })
  @Roles(UserRole.ADMIN)
  @Post('auth/role-permissions')
  setRolePermission(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: SetRolePermissionDto,
  ): void {
    void body;
    this.routeToMicroservice('AUTH', this.authClient, 'role-permissions', req, res);
  }

  @ApiTags('Auth')
  @ApiOperation({
    summary: '역할 권한 조회',
    description: '특정 역할의 API 접근 권한 목록을 조회합니다.',
  })
  @ApiBody({ type: GetRolePermissionsDto })
  @ApiExtraModels(BaseResponseDto, RolePermissionsResponseDto)
  @ApiCreatedResponse({
    description: '권한 목록 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RolePermissionsResponseDto) } } },
      ],
    },
  })
  @Roles(UserRole.ADMIN)
  @Get('auth/role-permissions')
  getRolePermissions(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: GetRolePermissionsDto,
  ): void {
    void body;
    this.routeToMicroservice('AUTH', this.authClient, 'role-permissions', req, res);
  }

  @ApiTags('Auth')
  @ApiOperation({
    summary: '역할 권한 삭제',
    description: '특정 역할의 API 접근 권한을 삭제합니다.',
  })
  @ApiBody({ type: SetRolePermissionDto })
  @ApiExtraModels(BaseResponseDto)
  @ApiCreatedResponse({
    description: '권한이 성공적으로 삭제됨',
    schema: {
      allOf: [{ $ref: getSchemaPath(BaseResponseDto) }, { properties: { data: { type: 'null' } } }],
    },
  })
  @Roles(UserRole.ADMIN)
  @Delete('auth/role-permissions')
  removeRolePermission(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: SetRolePermissionDto,
  ): void {
    void body;
    this.routeToMicroservice('AUTH', this.authClient, 'role-permissions', req, res);
  }

  @ApiTags('Auth')
  @ApiOperation({
    summary: '사용자 역할 변경',
    description: '특정 사용자의 역할을 변경합니다.',
  })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiExtraModels(BaseResponseDto)
  @ApiCreatedResponse({
    description: '사용자 역할이 성공적으로 변경됨',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                role: { type: 'string', enum: Object.values(UserRole) },
              },
            },
          },
        },
      ],
    },
  })
  @Roles(UserRole.ADMIN)
  @Put('auth/user-role')
  async updateUserRole(
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    void dto;
    this.routeToMicroservice('AUTH', this.authClient, 'user-role', req, res);
  }

  @ApiTags('Event')
  @Get('event')
  @ApiOperation({ summary: '이벤트 서비스 루트 경로' })
  handleEventRequests(
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    this.routeToMicroservice('EVENT', this.eventClient, '', req, res);
  }

  @ApiExcludeEndpoint()
  @All('*')
  handleNotFound(@Req() req: Request, @Res() res: Response): void {
    this.logger.warn(`Unknown API path requested: ${req.method} ${req.url}`);
    res.status(HttpStatus.NOT_FOUND).json({
      statusCode: HttpStatus.NOT_FOUND,
      message: `Cannot ${req.method} ${req.path}`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  private routeToMicroservice(
    serviceName: string,
    client: ClientProxy,
    path: string,
    req: Request,
    res: Response,
  ): void {
    this.logger.log(
      `Routing request to ${serviceName} service${path ? `: ${req.method} ${req.url}` : ' root'}`,
    );

    const pattern = {
      cmd: 'proxy',
    };

    const payload: ProxyPayload = {
      path,
      method: req.method,
      body: {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      },
    };

    try {
      this.sendRequestToMicroservice(client, pattern, payload, serviceName, req, res);
    } catch (error) {
      this.handleUnexpectedError(error, serviceName, res);
    }
  }

  private sendRequestToMicroservice(
    client: ClientProxy,
    pattern: Record<string, unknown>,
    payload: ProxyPayload,
    serviceName: string,
    req: Request,
    res: Response,
  ): void {
    client
      .send<Record<string, unknown>>(pattern, payload)
      .pipe(
        timeout(10000),
        catchError(err => {
          this.logger.error(`Error from ${serviceName} service: ${err.message}`, err.stack);
          return throwError(
            () =>
              new HttpException(
                err.message || `${serviceName} Service Error`,
                err.status || HttpStatus.INTERNAL_SERVER_ERROR,
              ),
          );
        }),
      )
      .subscribe({
        next: (data: { statusCode?: number } & Record<string, unknown>) => {
          this.logger.log(`Response from ${serviceName} service for ${req.url}`);
          const status = data.statusCode || HttpStatus.OK;
          res.status(status).json(data);
        },
        error: (err: { message?: string; status?: number; stack?: string }) => {
          this.logger.error(
            `Error processing ${serviceName} service response: ${err.message ?? 'Unknown error'}`,
          );
          const status: number =
            typeof err.status === 'number' ? err.status : HttpStatus.INTERNAL_SERVER_ERROR;
          res.status(status).json({
            statusCode: status,
            message: err.message || 'An error occurred',
            timestamp: new Date().toISOString(),
          });
        },
      });
  }

  private handleUnexpectedError(error: unknown, serviceName: string, res: Response): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Unexpected error routing to ${serviceName} service: ${errorMessage}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: `Gateway Error - Unable to communicate with ${serviceName} service`,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
    });
  }
}
