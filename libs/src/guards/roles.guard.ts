import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@app/common/redis';
import { ForbiddenException, UnauthorizedException } from '@app/common/exceptions';
import { UserRole } from '@app/common/schemas';
import { UserInfo } from '@app/common/dto/user/types';

interface RequestWithUser extends Request {
  user: UserInfo;
  method: string;
  route: {
    path: string;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const method = request.method;
    const path = request.route.path;

    if (!user || !user.role) {
      throw new UnauthorizedException('Authentication required');
    }

    // Admin has full access to all endpoints
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const cacheKey = `authorization:${user.role}:${method}`;
    const allowedPaths = await this.redisService.sMembers(cacheKey);

    if (!allowedPaths.includes(path)) {
      throw new ForbiddenException('Access denied for this role');
    }

    return true;
  }
}
