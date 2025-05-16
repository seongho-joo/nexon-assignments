import { Module } from '@nestjs/common';
import { AppController } from '@app/event/app.controller';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
