import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
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
} 