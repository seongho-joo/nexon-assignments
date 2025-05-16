import { Module } from '@nestjs/common';
import { AppController } from '@app/gateway/app.controller';
import { CommonModule } from '@app/common';

@Module({
  imports: [CommonModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
