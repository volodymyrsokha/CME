import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from './participant.entity';
import { ParticipantRole, ParticipantType } from '@cme/shared';

@Injectable()
export class ParticipantRepository {
  constructor(
    @InjectRepository(Participant)
    private readonly repository: Repository<Participant>,
  ) {}

  async create(
    roomId: string,
    userId: string | null,
    type: ParticipantType,
    role: ParticipantRole,
    displayName?: string,
  ): Promise<Participant> {
    const participant = this.repository.create({
      roomId,
      userId,
      type,
      role,
      displayName,
    });
    return this.repository.save(participant);
  }

  async findByRoomId(roomId: string): Promise<Participant[]> {
    return this.repository.find({
      where: { roomId, leftAt: null },
    });
  }

  async findById(id: string): Promise<Participant | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async markAsLeft(id: string): Promise<void> {
    await this.repository.update(id, {
      leftAt: new Date(),
    });
  }

  async updateMediaState(
    id: string,
    videoEnabled: boolean,
    audioEnabled: boolean,
    screenSharing: boolean,
  ): Promise<void> {
    await this.repository.update(id, {
      videoEnabled,
      audioEnabled,
      screenSharing,
    });
  }

  async save(participant: Participant): Promise<Participant> {
    return this.repository.save(participant);
  }
}
