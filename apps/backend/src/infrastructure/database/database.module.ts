import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Room } from '../../domain/room/room.entity';
import { Participant } from '../../domain/participant/participant.entity';
import { Message } from '../../domain/message/message.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'cme'),
        entities: [Room, Participant, Message],
        synchronize: configService.get('NODE_ENV') !== 'production', // Auto-sync in dev
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([Room, Participant, Message]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
