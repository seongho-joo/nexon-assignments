import { Module } from '@nestjs/common';
import { AppController } from '@app/auth/app.controller';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
