import { Module } from '@nestjs/common';
import { GatewayController } from '@app/gateway/gateway.controller';
import { CommonModule } from '@app/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [CommonModule, HttpModule, ProxyModule],
  controllers: [GatewayController],
  providers: [],
})
export class GatewayModule {}
