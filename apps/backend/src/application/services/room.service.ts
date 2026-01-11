import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoomRepository } from '../../domain/room/room.repository';
import { ParticipantRepository } from '../../domain/participant/participant.repository';
import { MessageRepository } from '../../domain/message/message.repository';
import {
  RoomDto,
  ParticipantDto,
  MessageDto,
  CreateRoomDto,
  JoinRoomDto,
  SendMessageDto,
  RoomStatus,
  ParticipantRole,
  ParticipantType,
} from '@cme/shared';

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<RoomDto> {
    const room = await this.roomRepository.create();
    return this.mapRoomToDto(room);
  }

  async getRoomById(roomId: string): Promise<RoomDto> {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    return this.mapRoomToDto(room);
  }

  async joinRoom(dto: JoinRoomDto): Promise<ParticipantDto> {
    const room = await this.roomRepository.findById(dto.roomId);

    if (!room) {
      throw new NotFoundException(`Room ${dto.roomId} not found`);
    }

    if (room.status !== RoomStatus.ACTIVE) {
      throw new BadRequestException('Room is not active');
    }

    const participant = await this.participantRepository.create(
      dto.roomId,
      dto.userId || null,
      dto.type || ParticipantType.USER,
      ParticipantRole.PARTICIPANT,
      dto.displayName,
    );

    return this.mapParticipantToDto(participant);
  }

  async leaveRoom(roomId: string, participantId: string): Promise<void> {
    const participant = await this.participantRepository.findById(participantId);

    if (!participant) {
      throw new NotFoundException(`Participant ${participantId} not found`);
    }

    if (participant.roomId !== roomId) {
      throw new BadRequestException('Participant is not in this room');
    }

    await this.participantRepository.markAsLeft(participantId);

    const activeParticipants = await this.participantRepository.findByRoomId(roomId);

    if (activeParticipants.length === 0) {
      await this.roomRepository.endRoom(roomId);
    }
  }

  async endRoom(roomId: string): Promise<void> {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const participants = await this.participantRepository.findByRoomId(roomId);
    for (const participant of participants) {
      await this.participantRepository.markAsLeft(participant.id);
    }

    await this.roomRepository.endRoom(roomId);
  }

  async getRoomParticipants(roomId: string): Promise<ParticipantDto[]> {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const participants = await this.participantRepository.findByRoomId(roomId);
    return participants.map((p) => this.mapParticipantToDto(p));
  }

  async sendMessage(
    participantId: string,
    dto: SendMessageDto,
  ): Promise<MessageDto> {
    const participant = await this.participantRepository.findById(participantId);

    if (!participant) {
      throw new NotFoundException(`Participant ${participantId} not found`);
    }

    if (participant.roomId !== dto.roomId) {
      throw new BadRequestException('Participant is not in this room');
    }

    const message = await this.messageRepository.create(
      dto.roomId,
      participantId,
      dto.content,
    );

    return this.mapMessageToDto(message, participant.displayName || undefined);
  }

  async getRoomMessages(roomId: string, limit = 100): Promise<MessageDto[]> {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const messages = await this.messageRepository.findByRoomId(roomId, limit);
    return messages.map((m) =>
      this.mapMessageToDto(m, m.participant?.displayName || undefined),
    );
  }

  async getActiveRooms(): Promise<RoomDto[]> {
    const rooms = await this.roomRepository.findActiveRooms();
    return rooms.map((r) => this.mapRoomToDto(r));
  }

  private mapRoomToDto(room: any): RoomDto {
    return {
      id: room.id,
      status: room.status,
      createdAt: room.createdAt,
      endedAt: room.endedAt || undefined,
      participantCount: room.participants?.length || 0,
    };
  }

  private mapParticipantToDto(participant: any): ParticipantDto {
    return {
      id: participant.id,
      roomId: participant.roomId,
      userId: participant.userId || undefined,
      type: participant.type,
      role: participant.role,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt || undefined,
      displayName: participant.displayName || undefined,
    };
  }

  private mapMessageToDto(message: any, senderName?: string): MessageDto {
    return {
      id: message.id,
      roomId: message.roomId,
      participantId: message.participantId,
      content: message.content,
      sentAt: message.sentAt,
      senderName,
    };
  }
}
