import { Module } from '@nestjs/common';
import { AppController } from '@app/gateway/app.controller';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
