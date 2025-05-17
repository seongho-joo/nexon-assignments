import { Module } from '@nestjs/common';
import { AppController } from '@app/event/app.controller';
import { CommonModule } from '@app/common';
import { EventGateway } from './event.gateway';

@Module({
  imports: [CommonModule],
  controllers: [AppController, EventGateway],
  providers: [],
})
export class AppModule {}
