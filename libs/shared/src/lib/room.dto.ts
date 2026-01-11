export enum RoomStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

export enum ParticipantRole {
  HOST = 'host',
  PARTICIPANT = 'participant',
}

export enum ParticipantType {
  USER = 'user',
  AI_AGENT = 'ai_agent',
}

export interface RoomDto {
  id: string;
  status: RoomStatus;
  createdAt: Date;
  endedAt?: Date;
  participantCount?: number;
}

export interface ParticipantDto {
  id: string;
  roomId: string;
  userId?: string;
  type: ParticipantType;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt?: Date;
  displayName?: string;
}

export interface MessageDto {
  id: string;
  roomId: string;
  participantId: string;
  content: string;
  sentAt: Date;
  senderName?: string;
}

export interface CreateRoomDto {
  hostUserId?: string;
  hostDisplayName?: string;
}

export interface JoinRoomDto {
  roomId: string;
  userId?: string;
  displayName?: string;
  type?: ParticipantType;
}

export interface SendMessageDto {
  roomId: string;
  content: string;
}
