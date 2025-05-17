import { Module } from '@nestjs/common';
import { AuthController } from '@app/auth/auth.controller';
import { CommonModule } from '@app/common';
import { AuthGateway } from './auth.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { User, UserSchema } from '@app/common/schemas';
import { UserService } from './user/user.service';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthController, AuthGateway],
  providers: [UserService],
})
export class AuthModule {}
