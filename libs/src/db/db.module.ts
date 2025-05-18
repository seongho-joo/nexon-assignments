import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '@app/common/logger';
import mongoose from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const logger = new CustomLoggerService();
        logger.setContext('MongooseModule');

        const uri =
          configService.get<string>('MONGO_URI') ||
          'mongodb://root:example@localhost:27017/nexon?authSource=admin';

        logger.log(`MongoDB 연결: ${uri.split('@')[1] || uri}`);

        return {
          uri,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
          connectionFactory: (connection: mongoose.Connection) => {
            connection.on('connected', () => {
              logger.log('MongoDB 데이터베이스에 연결되었습니다.');
            });

            connection.on('disconnected', () => {
              logger.warn('MongoDB 데이터베이스 연결이 끊어졌습니다.');
            });

            connection.on('error', (error: Error) => {
              logger.error('MongoDB 연결 오류', error);
            });

            return connection;
          },
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DbModule {}
