import { Module } from '@nestjs/common';
import { GatewayController } from '@app/gateway/gateway.controller';
import { CommonModule } from '@app/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyModule } from './proxy/proxy.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '@app/common/services/auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@app/common/schemas';
import { UserService } from '@app/common/services/user.service';
import { UserRepository } from '@app/common/repositories/user.repository';

@Module({
  imports: [
    CommonModule,
    HttpModule,
    ProxyModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
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
  ],
  controllers: [GatewayController],
  providers: [AuthService, UserService, UserRepository],
})
export class GatewayModule {}
