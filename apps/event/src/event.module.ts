import { Module } from '@nestjs/common';
import { EventController } from '@app/event/event.controller';
import { CommonModule } from '@app/common';
import { EventGateway } from './event.gateway';

@Module({
  imports: [CommonModule],
  controllers: [EventController, EventGateway],
  providers: [],
})
export class EventModule {}
