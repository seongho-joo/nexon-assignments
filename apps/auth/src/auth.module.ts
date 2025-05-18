import { Module } from '@nestjs/common';
import { AuthController } from '@app/auth/auth.controller';
import { CommonModule } from '@app/common';
import { AuthGateway } from '@app/auth/auth.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { User, UserSchema } from '@app/common/schemas';
import { UserService } from '@app/common/services/user.service';
import { UserRepository } from '@app/common/repositories/user.repository';

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
  providers: [UserService, UserRepository],
})
export class AuthModule {}
