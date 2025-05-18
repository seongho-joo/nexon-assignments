import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event } from '@app/common/schemas';
import { CustomLoggerService } from '@app/common/logger';

export interface CreateEventParams {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  status: string;
  isActive: boolean;
  rewards?: any[];
}

@Injectable()
export class EventRepository {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('EventRepository');
  }

  async create(params: CreateEventParams): Promise<Event> {
    const event = await this.eventModel.create(params);
    return event;
  }

  async findById(eventId: string): Promise<Event | null> {
    return this.eventModel.findById(eventId).exec();
  }

  async update(eventId: string, updateData: Partial<Event>): Promise<Event | null> {
    return this.eventModel
      .findByIdAndUpdate(eventId, updateData, { new: true })
      .exec();
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find({ isActive: true }).exec();
  }

  async findByStatus(status: string): Promise<Event[]> {
    return this.eventModel.find({ status, isActive: true }).exec();
  }
} 