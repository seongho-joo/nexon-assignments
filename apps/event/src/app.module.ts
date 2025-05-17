import { Module } from '@nestjs/common';
import { AppController } from '@app/event/app.controller';
import { CommonModule } from '@app/common';

@Module({
  imports: [CommonModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
