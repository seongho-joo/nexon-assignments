import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@app/common/redis';
import { ForbiddenException, UnauthorizedException } from '@app/common/exceptions';
import { UserRole } from '@app/common/schemas';
import { UserInfo } from '@app/common/dto/user/types';
import { RedisEnum } from '@app/common/redis/redis.enum';
import { ROLES_KEY } from '@app/common/decorators/roles.decorator';

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
    const path = this.normalizePathPattern(request.url);

    if (!user || !user.role) {
      throw new UnauthorizedException('Authentication required');
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      if (user.role === UserRole.ADMIN) {
        return true;
      }

      const prefix = `${user.role.toUpperCase()}:${method}`;
      const { key } = RedisEnum.AUTHORIZATION_ROLE.getKeyAndTTL(prefix);
      const allowedPaths = await this.redisService.sMembers(key);

      if (!allowedPaths.includes(path)) {
        throw new ForbiddenException('Access denied for this role');
      }

      return true;
    }

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Access denied: insufficient role');
    }

    return true;
  }

  private normalizePathPattern(path: string): string {
    // Remove query parameters
    const pathWithoutQuery = path.split('?')[0];

    const segments = pathWithoutQuery.split('/');

    const normalizedSegments = segments.map((segment, index) => {
      if (!segment || segment === 'api') {
        return segment;
      }

      if (/^[0-9a-fA-F]{24}$/.test(segment)) {
        const prevSegment = segments[index - 1];
        if (prevSegment) {
          const paramName = prevSegment.endsWith('s') ? prevSegment.slice(0, -1) : prevSegment;
          return `:${paramName}Id`;
        }
      }

      return segment;
    });

    return normalizedSegments.join('/');
  }
}
