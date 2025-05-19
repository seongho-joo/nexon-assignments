import {
  All,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
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
  ApiResponse,
} from '@nestjs/swagger';
import { BaseResponseDto, GatewayCommandEnum } from '@app/common/dto';
import {
  LoginRequestDto,
  LoginResponseDto,
  LogoutRequestDto,
  LogoutResponseDto,
  SignUpQueryDto,
  SignUpRequestDto,
  SignUpResponseDto,
  UserInfo,
} from '@app/common/dto/user';
import { Public, Roles, User } from '@app/common/decorators';
import { UserRole } from '@app/common/schemas';
import {
  GetRolePermissionsDto,
  RolePermissionsResponseDto,
  SetRolePermissionDto,
  UpdateUserRoleDto,
} from '@app/common/dto/role';
import {
  CreateEventDto,
  EventResponseDto,
  EventListResponseDto,
  EventRewardsResponseDto,
} from '@app/common/dto/event';
import { RewardDto } from '@app/common/dto/event/reward.dto';
import {
  CreateRequestDto,
  RequestResponseDto,
  RequestListResponseDto,
} from '@app/common/dto/request';
import { OwnershipGuard } from '@app/common/guards';
import { PointTransactionListResponseDto } from '@app/common/dto/point-transaction';

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
    this.routeToMicroservice('AUTH', this.authClient, 'sign-up', req, res, GatewayCommandEnum.AUTH);
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
    this.routeToMicroservice('AUTH', this.authClient, 'login', req, res, GatewayCommandEnum.AUTH);
  }

  @ApiTags('Auth')
  @ApiOperation({
    summary: '사용자 로그아웃',
    description: '사용자 로그아웃 처리 및 세션 종료',
  })
  @ApiBody({ type: LogoutRequestDto })
  @ApiExtraModels(BaseResponseDto, LogoutResponseDto)
  @ApiCreatedResponse({
    description: '로그아웃 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(LogoutResponseDto) } } },
      ],
    },
  })
  @Post('auth/logout')
  handleLogout(@Req() req: Request, @Res() res: Response, @Body() body: LogoutRequestDto): void {
    void body;
    this.routeToMicroservice('AUTH', this.authClient, 'logout', req, res, GatewayCommandEnum.AUTH);
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
    this.routeToMicroservice(
      'AUTH',
      this.authClient,
      'role-permissions',
      req,
      res,
      GatewayCommandEnum.AUTH,
    );
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
    this.routeToMicroservice(
      'AUTH',
      this.authClient,
      'role-permissions',
      req,
      res,
      GatewayCommandEnum.AUTH,
    );
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
    this.routeToMicroservice(
      'AUTH',
      this.authClient,
      'role-permissions',
      req,
      res,
      GatewayCommandEnum.AUTH,
    );
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
    this.routeToMicroservice(
      'AUTH',
      this.authClient,
      'user-role',
      req,
      res,
      GatewayCommandEnum.AUTH,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '이벤트 생성',
    description: '새로운 이벤트를 생성합니다.',
  })
  @ApiBody({ type: CreateEventDto })
  @ApiExtraModels(BaseResponseDto, EventResponseDto)
  @ApiCreatedResponse({
    description: '이벤트가 성공적으로 생성됨',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(EventResponseDto) } } },
      ],
    },
  })
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('events')
  handleCreateEvent(
    @Body() dto: CreateEventDto,
    @Req() req: Request,
    @Res() res: Response,
    @User() user: UserInfo,
  ): void {
    void dto;
    req.headers['user-id'] = user.id;
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      'events',
      req,
      res,
      GatewayCommandEnum.EVENT,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '이벤트 보상 추가',
    description: '특정 이벤트에 보상을 추가합니다.',
  })
  @ApiBody({ type: RewardDto })
  @ApiExtraModels(BaseResponseDto, EventRewardsResponseDto)
  @ApiCreatedResponse({
    description: '이벤트 보상이 성공적으로 추가됨',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(EventRewardsResponseDto) } } },
      ],
    },
  })
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Post('events/:eventId/rewards')
  handleAddEventReward(
    @Param('eventId') eventId: string,
    @Body() dto: RewardDto,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    void dto;
    req.params['eventId'] = eventId;
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      `events/${eventId}/rewards`,
      req,
      res,
      GatewayCommandEnum.EVENT,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '이벤트 목록 조회',
    description: '모든 활성화된 이벤트 목록을 조회합니다.',
  })
  @ApiExtraModels(BaseResponseDto, EventListResponseDto)
  @ApiCreatedResponse({
    description: '이벤트 목록 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(EventListResponseDto) } } },
      ],
    },
  })
  @Get('events')
  handleGetEvents(@Req() req: Request, @Res() res: Response): void {
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      'events',
      req,
      res,
      GatewayCommandEnum.EVENT,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '이벤트 상세 조회',
    description: '특정 이벤트의 상세 정보를 조회합니다.',
  })
  @ApiExtraModels(BaseResponseDto, EventResponseDto)
  @ApiCreatedResponse({
    description: '이벤트 상세 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(EventResponseDto) } } },
      ],
    },
  })
  @Get('events/:eventId')
  handleGetEventById(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      `events/${eventId}`,
      req,
      res,
      GatewayCommandEnum.EVENT,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '이벤트 보상 목록 조회',
    description: '특정 이벤트의 보상 목록을 조회합니다.',
  })
  @ApiExtraModels(BaseResponseDto, EventRewardsResponseDto)
  @ApiCreatedResponse({
    description: '이벤트 보상 목록 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(EventRewardsResponseDto) } } },
      ],
    },
  })
  @Get('events/:eventId/rewards')
  handleGetEventRewards(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      `events/${eventId}/rewards`,
      req,
      res,
      GatewayCommandEnum.EVENT,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '보상 요청 생성',
    description: '특정 이벤트에 대한 보상을 요청합니다.',
  })
  @ApiBody({ type: CreateRequestDto })
  @ApiExtraModels(BaseResponseDto, RequestResponseDto)
  @ApiCreatedResponse({
    description: '보상 요청이 성공적으로 생성됨',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RequestResponseDto) } } },
      ],
    },
  })
  @Post('requests')
  handleCreateRequest(
    @Body() dto: CreateRequestDto,
    @Req() req: Request,
    @Res() res: Response,
    @User() user: UserInfo,
  ): void {
    void dto;
    req.headers['user-id'] = user.id;
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      'requests',
      req,
      res,
      GatewayCommandEnum.REQUEST,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '보상 요청 조회',
    description: '특정 보상 요청의 상세 정보를 조회합니다.',
  })
  @ApiExtraModels(BaseResponseDto, RequestResponseDto)
  @ApiCreatedResponse({
    description: '보상 요청 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RequestResponseDto) } } },
      ],
    },
  })
  @Get('requests/:requestId')
  handleGetRequestById(
    @Param('requestId') requestId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      `requests/${requestId}`,
      req,
      res,
      GatewayCommandEnum.REQUEST,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '모든 요청 조회',
    description: '시스템의 모든 보상 요청을 조회합니다.',
  })
  @ApiExtraModels(BaseResponseDto, RequestListResponseDto)
  @ApiCreatedResponse({
    description: '요청 목록 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RequestListResponseDto) } } },
      ],
    },
  })
  @Get('requests')
  handleGetRequests(@Req() req: Request, @Res() res: Response): void {
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      'requests',
      req,
      res,
      GatewayCommandEnum.REQUEST,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '특정 유저의 요청 목록 조회',
    description: '특정 유저의 모든 보상 요청을 조회합니다.',
  })
  @ApiExtraModels(BaseResponseDto, RequestListResponseDto)
  @ApiCreatedResponse({
    description: '유저 요청 목록 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RequestListResponseDto) } } },
      ],
    },
  })
  @UseGuards(OwnershipGuard)
  @Get('users/:userId/requests')
  handleGetUserRequests(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
    @User() user: UserInfo,
  ): void {
    if (user.id !== userId) {
      throw new HttpException('권한이 없습니다.', HttpStatus.FORBIDDEN);
    }
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      `users/${userId}/requests`,
      req,
      res,
      GatewayCommandEnum.REQUEST,
    );
  }

  @ApiTags('Event')
  @ApiOperation({
    summary: '특정 유저의 특정 요청 조회',
    description: '특정 유저의 특정 보상 요청을 조회합니다.',
  })
  @ApiExtraModels(BaseResponseDto, RequestResponseDto)
  @ApiCreatedResponse({
    description: '유저 요청 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RequestResponseDto) } } },
      ],
    },
  })
  @UseGuards(OwnershipGuard)
  @Get('users/:userId/requests/:requestId')
  handleGetUserRequest(
    @Param('userId') userId: string,
    @Param('requestId') requestId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      `users/${userId}/requests/${requestId}`,
      req,
      res,
      GatewayCommandEnum.REQUEST,
    );
  }

  @ApiOperation({ summary: '사용자의 포인트 트랜잭션 목록 조회' })
  @ApiExtraModels(PointTransactionListResponseDto)
  @ApiResponse({
    status: HttpStatus.OK,
    description: '포인트 트랜잭션 목록 조회 성공',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: {
              $ref: getSchemaPath(PointTransactionListResponseDto),
            },
          },
        },
      ],
    },
  })
  @UseGuards(OwnershipGuard)
  @Get('users/:userId/point-transactions')
  handleGetUserTransactions(
    @Req() req: Request,
    @Res() res: Response,
    @Param('userId') userId: string,
  ): void {
    this.routeToMicroservice(
      'EVENT',
      this.eventClient,
      `users/${userId}/point-transactions`,
      req,
      res,
      GatewayCommandEnum.POINT_TRANSACTION,
    );
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
    cmd: GatewayCommandEnum,
  ): void {
    this.logger.log(
      `Routing request to ${serviceName} service${path ? `: ${req.method} ${req.url}` : ' root'}`,
    );

    const pattern = {
      cmd,
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
        next: data => {
          this.logger.log(`Response from ${serviceName} service for ${req.url}`);
          const statusCode = (data as { statusCode?: number }).statusCode || HttpStatus.OK;
          res.status(statusCode).json(data);
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
