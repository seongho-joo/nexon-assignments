/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument*/
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '@app/common/services/user.service';
import { RedisService } from '@app/common/redis';
import { User, UserRole } from '@app/common/schemas';
import { RpcException } from '@nestjs/microservices';
import { ForbiddenException, UnauthorizedException } from '@app/common/exceptions';
import { RedisEnum } from '@app/common/redis/redis.enum';
import { UserInfo } from '@app/common/dto/user/types';
import {
  GetRolePermissionsDto,
  RolePermissionsResponseDto,
  SetRolePermissionDto,
} from '@app/common/dto/role/role-permission.dto';

interface TokenPayload extends UserInfo {
  userId: string;
}

@Injectable()
export class AuthService {
  private readonly TOKEN_EXPIRATION = 24 * 60 * 60; // 1 day in seconds

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.userService.findByUsername(username);
    if (!user || !user.isActive) {
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new RpcException(new UnauthorizedException('Invalid credentials'));
    }

    return user;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);

    const payload: TokenPayload = {
      userId: user.id,
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.storeToken(user.id, accessToken);
    await this.recordUserLogin(user.id);

    const userInfo: UserInfo = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken,
      user: userInfo,
    };
  }

  async refreshToken(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.isActive) {
      throw new RpcException(new UnauthorizedException('Invalid user'));
    }

    const payload: TokenPayload = {
      userId: user.id,
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Store new token and remove old one
    await this.storeToken(user.id, accessToken);

    return {
      accessToken,
    };
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token);
      const key = this.getAuthTokenKey(payload.userId);
      const storedToken = await this.redisService.get(key);
      return storedToken === token;
    } catch {
      return false;
    }
  }

  async logout(userId: string): Promise<void> {
    const key = this.getAuthTokenKey(userId);
    await this.redisService.delete(key);
  }

  private async storeToken(userId: string, token: string): Promise<void> {
    const { key, ttl } = RedisEnum.AUTH_TOKEN.getKeyAndTTL(userId);
    await this.redisService.set(key, token, ttl);
  }

  private getAuthTokenKey(userId: string): string {
    const { key } = RedisEnum.AUTH_TOKEN.getKeyAndTTL(userId);
    return key;
  }

  private getRoleKey(role: string, method: string): string {
    const prefix = `${role.toUpperCase()}:${method}`;
    const { key } = RedisEnum.AUTHORIZATION_ROLE.getKeyAndTTL(prefix);
    return key;
  }

  async setRolePermission(dto: SetRolePermissionDto): Promise<void> {
    const { role, method, path, allow } = dto;

    if (role === UserRole.ADMIN) {
      throw new RpcException(new ForbiddenException('Cannot modify admin permissions'));
    }

    const key = this.getRoleKey(role, method);

    if (allow) {
      await this.redisService.sAdd(key, path);
    } else {
      await this.redisService.sRem(key, path);
    }
  }

  async getRolePermissions(dto: GetRolePermissionsDto): Promise<RolePermissionsResponseDto> {
    const { role, method } = dto;
    const permissions: RolePermissionsResponseDto = {};

    if (method) {
      const key = this.getRoleKey(role, method);
      permissions[method] = await this.redisService.sMembers(key);
    } else {
      for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
        const key = this.getRoleKey(role, method);
        permissions[method] = await this.redisService.sMembers(key);
      }
    }

    return permissions;
  }

  async removeRolePermission(dto: SetRolePermissionDto): Promise<void> {
    const { role, method, path } = dto;

    if (role === UserRole.ADMIN) {
      throw new RpcException(new ForbiddenException('Cannot modify admin permissions'));
    }

    const key = this.getRoleKey(role, method);
    await this.redisService.sRem(key, path);
  }

  private async recordUserLogin(userId: string): Promise<void> {
    const { key: loginAtKey } = RedisEnum.CONTINUOUS_LOGIN_AT.getKeyAndTTL(userId);

    const loginAt = await this.redisService.get(loginAtKey);
    if (!loginAt) {
      const { key: loginCountKey } = RedisEnum.CONTINUOUS_LOGIN_COUNT.getKeyAndTTL(userId);
      await this.redisService.increment(loginCountKey);
    }
  }
}
