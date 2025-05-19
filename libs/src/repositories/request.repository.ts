import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from '@app/common/schemas';

@Injectable()
export class RequestRepository {
  constructor(@InjectModel(Request.name) private readonly requestModel: Model<Request>) {}

  async create(data: Partial<Request>): Promise<Request> {
    return this.requestModel.create(data);
  }

  async findById(requestId: string): Promise<Request | null> {
    return this.requestModel.findById(requestId).exec();
  }

  async findByUserIdAndEventId(userId: string, eventId: string): Promise<Request | null> {
    return this.requestModel.findOne({ userId, eventId }).exec();
  }

  async findAll(): Promise<Request[]> {
    return this.requestModel.find().sort({ createdAt: -1 }).exec();
  }

  async count(): Promise<number> {
    return this.requestModel.countDocuments().exec();
  }

  async findByUserId(userId: string): Promise<Request[]> {
    return this.requestModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async countByUserId(userId: string): Promise<number> {
    return this.requestModel.countDocuments({ userId }).exec();
  }
}
