import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { PointTransaction } from '@app/common/schemas';

@Injectable()
export class PointTransactionRepository {
  constructor(
    @InjectModel(PointTransaction.name) private readonly pointTransactionModel: Model<PointTransaction>,
  ) {}

  async create(data: Partial<PointTransaction>, session?: ClientSession): Promise<PointTransaction> {
    const doc = new this.pointTransactionModel(data);
    return doc.save({ session });
  }

  async findByUserId(userId: string): Promise<PointTransaction[]> {
    return this.pointTransactionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ timestamp: -1 })
      .exec();
  }

  async countByUserId(userId: string): Promise<number> {
    return this.pointTransactionModel
      .countDocuments({ userId: new Types.ObjectId(userId) })
      .exec();
  }
} 