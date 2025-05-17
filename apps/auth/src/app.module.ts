import { Module } from '@nestjs/common';
import { AppController } from '@app/auth/app.controller';
import { CommonModule } from '@app/common';

@Module({
  imports: [CommonModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
