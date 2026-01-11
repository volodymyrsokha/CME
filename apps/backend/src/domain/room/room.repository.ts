import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { RoomStatus } from '@cme/shared';

@Injectable()
export class RoomRepository {
  constructor(
    @InjectRepository(Room)
    private readonly repository: Repository<Room>,
  ) {}

  async create(): Promise<Room> {
    const room = this.repository.create({
      status: RoomStatus.ACTIVE,
    });
    return this.repository.save(room);
  }

  async findById(id: string): Promise<Room | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['participants'],
    });
  }

  async findActiveRooms(): Promise<Room[]> {
    return this.repository.find({
      where: { status: RoomStatus.ACTIVE },
      relations: ['participants'],
    });
  }

  async endRoom(id: string): Promise<void> {
    await this.repository.update(id, {
      status: RoomStatus.ENDED,
      endedAt: new Date(),
    });
  }

  async save(room: Room): Promise<Room> {
    return this.repository.save(room);
  }
}
