/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from '@app/common/filters';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@app/common/redis';
import { AuthService } from '@app/common/services/auth.service';
import { JwtAuthGuard, RolesGuard } from '@app/common/guards';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.setGlobalPrefix('api/');

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());

  const reflector = app.get(Reflector);
  const redisService = app.get(RedisService);
  const authService = app.get(AuthService);

  app.useGlobalGuards(
    new JwtAuthGuard(authService, reflector),
    new RolesGuard(reflector, redisService),
  );

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('NestJS 마이크로서비스 아키텍처의 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const tagToRemove = 'Proxy';
  document.tags = (document.tags || []).filter(t => t.name !== tagToRemove);

  Object.values(document.paths).forEach(pathItem => {
    Object.values(pathItem).forEach(operation => {
      if (operation && Array.isArray(operation.tags)) {
        operation.tags = operation.tags.filter(t => t !== tagToRemove);
      }
    });
  });

  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('GATEWAY_PORT') || 3000;

  await app.listen(port);
}

bootstrap();
