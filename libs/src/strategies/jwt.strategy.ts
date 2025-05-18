import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@app/common/exceptions';
import { UserInfo } from '@app/common/dto/user/types';

interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: JwtPayload): UserInfo {
    if (!payload.userId || !payload.username || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
    };
  }
}
