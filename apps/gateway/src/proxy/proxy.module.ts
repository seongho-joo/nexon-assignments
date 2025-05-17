import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProxyController } from './proxy.controller';
import { CommonModule } from '@app/common';

@Module({
  imports: [
    CommonModule,
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('AUTH_HOST') || 'localhost',
            port: configService.get('AUTH_MICROSERVICE_PORT') || 4001,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'EVENT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('EVENT_HOST') || 'localhost',
            port: configService.get('EVENT_MICROSERVICE_PORT') || 4002,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ProxyController],
})
export class ProxyModule {}
