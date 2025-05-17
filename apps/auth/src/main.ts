import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from '@app/common/filters';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/auth');

  // 전역 예외 필터 적용
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Auth API')
    .setDescription('인증 및 사용자 관리 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 환경변수에서 포트 가져오기
  const configService = app.get(ConfigService);
  const port = configService.get<number>('AUTH_PORT') || 3001;

  // Set up microservice
  const microservicePort = configService.get<number>('AUTH_MICROSERVICE_PORT') || 4001;
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: microservicePort,
    },
  });

  // Start microservice
  await app.startAllMicroservices();
  console.log(`Auth microservice is running on port: ${microservicePort}`);

  await app.listen(port);
  console.log(`Auth service is running on: http://localhost:${port}`);
}

bootstrap();
