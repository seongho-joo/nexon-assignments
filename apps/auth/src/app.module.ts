import { Module } from '@nestjs/common';
import { AppController } from '@app/auth/app.controller';
import { CommonModule } from '@app/common';
import { AuthGateway } from './auth.gateway';

@Module({
  imports: [CommonModule],
  controllers: [AppController, AuthGateway],
  providers: [],
})
export class AppModule {}
