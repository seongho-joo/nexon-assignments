import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/event/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/event');

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Event API')
    .setDescription('이벤트 관리 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3002);
}

bootstrap();
