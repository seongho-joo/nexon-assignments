import { Module } from '@nestjs/common';
import { AuthController } from '@app/auth/controller/auth.controller';
import { CommonModule } from '@app/common';
import { AuthGateway } from '@app/auth/gateway/auth.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from '@app/common/schemas';
import { UserService } from '@app/common/services/user.service';
import { UserRepository } from '@app/common/repositories/user.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@app/common/redis';
import { LoggerModule } from '@app/common/logger';
import { AuthService } from '@app/common/services/auth.service';
import { JwtStrategy } from '@app/common/strategies/jwt.strategy';
import { PlayTimeTrackerService } from '@app/common/services/play-time-tracker.service';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      cache: true,
      expandVariables: true,
    }),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        if (!uri) {
          throw new Error('MONGO_URI environment variable is not defined');
        }
        return { uri };
      },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RedisModule,
    LoggerModule,
  ],
  controllers: [AuthController, AuthGateway],
  providers: [AuthService, UserService, UserRepository, JwtStrategy, PlayTimeTrackerService],
})
export class AuthModule {}
