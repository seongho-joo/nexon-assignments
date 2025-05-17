import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/event/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from '@app/common/filters';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/event');

  // 전역 예외 필터 적용
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Event API')
    .setDescription('이벤트 관리 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 환경변수에서 포트 가져오기
  const configService = app.get(ConfigService);
  const port = configService.get<number>('EVENT_PORT') || 3002;

  // Set up microservice
  const microservicePort = configService.get<number>('EVENT_MICROSERVICE_PORT') || 4002;
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: microservicePort,
    },
  });

  // Start microservice
  await app.startAllMicroservices();
  console.log(`Event microservice is running on port: ${microservicePort}`);

  await app.listen(port);
  console.log(`Event service is running on: http://localhost:${port}`);
}

bootstrap();
