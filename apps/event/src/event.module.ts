import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Event,
  EventSchema,
  PointTransaction,
  PointTransactionSchema,
  RequestSchema,
  User,
  UserSchema,
} from '@app/common/schemas';
import { EventGateway, RequestGateway } from '@app/event/gateway';
import { EventService } from '@app/common/services/event.service';
import { EventRepository } from '@app/common/repositories/event.repository';
import { LoggerModule } from '@app/common/logger';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '@app/common/strategies/jwt.strategy';
import { EventController } from '@app/event/controller/event.controller';
import { RequestService } from '@app/common/services/request.service';
import { RequestRepository } from '@app/common/repositories/request.repository';
import { RewardConditionValidatorService } from '@app/common/services/reward-condition-validator.service';
import { RedisModule } from '@app/common/redis';
import { PointTransactionRepository } from '@app/common/repositories/point-transaction.repository';
import { UserRepository } from '@app/common/repositories/user.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
    MongooseModule.forFeature([
      {
        name: Event.name,
        schema: EventSchema,
      },
      {
        name: Request.name,
        schema: RequestSchema,
      },
      {
        name: PointTransaction.name,
        schema: PointTransactionSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    LoggerModule,
    RedisModule,
  ],
  controllers: [EventController, EventGateway, RequestGateway],
  providers: [
    EventService,
    EventRepository,
    JwtStrategy,
    RequestService,
    RequestRepository,
    RewardConditionValidatorService,
    PointTransactionRepository,
    UserRepository,
  ],
})
export class EventModule {}
