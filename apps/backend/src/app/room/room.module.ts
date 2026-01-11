import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomController } from './room.controller';
import { RoomService } from '../../application/services/room.service';
import { Room } from '../../domain/room/room.entity';
import { Participant } from '../../domain/participant/participant.entity';
import { Message } from '../../domain/message/message.entity';
import { RoomRepository } from '../../domain/room/room.repository';
import { ParticipantRepository } from '../../domain/participant/participant.repository';
import { MessageRepository } from '../../domain/message/message.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Participant, Message])],
  controllers: [RoomController],
  providers: [RoomService, RoomRepository, ParticipantRepository, MessageRepository],
  exports: [RoomService],
})
export class RoomModule {}
