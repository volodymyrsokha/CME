import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
  ) {}

  async create(roomId: string, participantId: string, content: string): Promise<Message> {
    const message = this.repository.create({
      roomId,
      participantId,
      content,
    });
    return this.repository.save(message);
  }

  async findByRoomId(roomId: string, limit = 100): Promise<Message[]> {
    return this.repository.find({
      where: { roomId },
      order: { sentAt: 'ASC' },
      take: limit,
      relations: ['participant'],
    });
  }

  async save(message: Message): Promise<Message> {
    return this.repository.save(message);
  }
}
