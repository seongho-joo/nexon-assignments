import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/event/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/event');
  await app.listen(3002);
}

bootstrap();
