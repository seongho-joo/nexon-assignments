import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, RequestStatus } from '@app/common/schemas';

@Injectable()
export class RequestRepository {
  constructor(@InjectModel(Request.name) private readonly requestModel: Model<Request>) {}

  async create(data: Partial<Request>): Promise<Request> {
    const request = new this.requestModel(data);
    return request.save();
  }

  async findByUserIdAndEventId(userId: string, eventId: string): Promise<Request | null> {
    return this.requestModel.findOne({ userId, eventId }).exec();
  }

  async findById(requestId: string): Promise<Request | null> {
    return this.requestModel.findById(requestId).exec();
  }
}
