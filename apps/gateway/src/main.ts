import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from '@app/common/filters';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.setGlobalPrefix('api/');

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
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
