import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from '@app/common/schemas';
import { EventGateway } from './event.gateway';
import { EventService } from '@app/common/services/event.service';
import { EventRepository } from '@app/common/repositories/event.repository';
import { LoggerModule } from '@app/common/logger';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '@app/common/strategies/jwt.strategy';
import { EventController } from '@app/event/event.controller';

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
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    LoggerModule,
  ],
  controllers: [EventController, EventGateway],
  providers: [EventService, EventRepository, JwtStrategy],
})
export class EventModule {}
