/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@app/common/services/auth.service';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@app/common/exceptions';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // First, check JWT validity using Passport
    let isJwtValid: boolean;
    try {
      isJwtValid = (await super.canActivate(context)) as boolean;
    } catch (err) {
      throw new UnauthorizedException(err instanceof Error ? err.message : 'Unauthorized');
    }
    if (!isJwtValid) {
      return false;
    }
    // Then, verify token exists in Redis
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    const isValid = await this.authService.validateToken(token);
    if (!isValid) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
