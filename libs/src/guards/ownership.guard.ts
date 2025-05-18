import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '@app/common/schemas';
import { ForbiddenException, UnauthorizedException } from '@app/common/exceptions';

interface RequestWithUser extends Request {
  user: {
    id: string;
    username: string;
    role: string;
  };
  params: {
    userId: string;
  };
}

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const requestedUserId = request.params.userId;

    if (!user || !requestedUserId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Admin and other roles have full access
    if (user.role !== UserRole.USER) {
      return true;
    }

    // Users can only access their own resources
    if (user.id !== requestedUserId) {
      throw new ForbiddenException('Access denied: You can only access your own resources');
    }

    return true;
  }
}
