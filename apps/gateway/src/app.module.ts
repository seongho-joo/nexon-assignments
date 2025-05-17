import { Module } from '@nestjs/common';
import { AppController } from '@app/gateway/app.controller';
import { CommonModule } from '@app/common';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [CommonModule, HttpModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
