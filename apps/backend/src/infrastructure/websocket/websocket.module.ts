import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalingGateway } from './signaling.gateway';
import { Participant } from '../../domain/participant/participant.entity';
import { ParticipantRepository } from '../../domain/participant/participant.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Participant])],
  providers: [SignalingGateway, ParticipantRepository],
  exports: [SignalingGateway],
})
export class WebsocketModule {}
