import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '@app/common/logger';
import { UserRole } from '@app/common/schemas';
import { BadRequestException, UnauthorizedException } from '@app/common/exceptions';
import { UserRepository } from '@app/common/repositories/user.repository';
import { User } from '@app/common/schemas';

@Injectable()
export class UserService {
  private readonly ADMIN_KEY: string;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: CustomLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext('UserService');
    this.ADMIN_KEY = this.configService.get<string>('ADMIN_KEY') || '';
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async register(
    username: string,
    password: string,
    role = UserRole.USER,
    adminKey?: string,
  ): Promise<string> {
    this.logger.log(`Attempting to register user: ${username}`);

    if (role === UserRole.ADMIN) {
      if (!adminKey) {
        throw new RpcException(
          new BadRequestException('Admin key is required for admin registration.'),
        );
      }

      if (adminKey !== this.ADMIN_KEY) {
        throw new RpcException(new UnauthorizedException('Invalid admin key.'));
      }
    }

    if (!username || !password) {
      throw new RpcException(new BadRequestException('Username and password are required'));
    }

    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new RpcException(new BadRequestException('Username already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.userRepository.create({
      username,
      password: hashedPassword,
      role,
      balance: 0,
      isActive: true,
    });
  }
}
