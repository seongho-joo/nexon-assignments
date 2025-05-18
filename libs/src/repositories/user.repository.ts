import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '@app/common/schemas';
import { CustomLoggerService } from '@app/common/logger';
import { RpcException } from '@nestjs/microservices';
import { InternalServerException } from '@app/common/exceptions';

export interface CreateUserParams {
  username: string;
  password: string;
  role: UserRole;
  balance: number;
  isActive: boolean;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('UserRepository');
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async create(params: CreateUserParams): Promise<string> {
    const user = await this.userModel.create(params);
    return user.userId;
  }

  async updateBalance(userId: string, balance: number): Promise<void> {
    await this.userModel.updateOne({ userId }, { balance }).exec();
  }

  async updateActiveStatus(userId: string, isActive: boolean): Promise<void> {
    await this.userModel.updateOne({ userId }, { isActive }).exec();
  }

  async findById(userId: string): Promise<User | null> {
    return this.userModel.findById(userId).exec();
  }

  async updateRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userModel.findOneAndUpdate({ userId }, { role }, { new: true }).exec();
    if (!user) {
      throw new RpcException(new InternalServerException('User not found'));
    }
    return user;
  }
}
