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

  async updateStatus(
    requestId: string,
    status: RequestStatus,
    metadata?: Record<string, any>,
  ): Promise<Request | null> {
    const update: Record<string, any> = { status };

    if (status === RequestStatus.APPROVED) {
      update.approvedAt = new Date();
    } else if (status === RequestStatus.COMPLETED) {
      update.completedAt = new Date();
    }

    if (metadata) {
      update.metadata = metadata;
    }

    return this.requestModel.findOneAndUpdate({ requestId }, update, { new: true }).exec();
  }
}
