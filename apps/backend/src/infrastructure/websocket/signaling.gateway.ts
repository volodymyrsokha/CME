import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import {
  SignalingEventType,
  WebRTCOffer,
  WebRTCAnswer,
  WebRTCIceCandidate,
  MediaStateDto,
  JoinRoomDto,
  SendMessageDto,
} from '@cme/shared';
import { ParticipantRepository } from '../../domain/participant/participant.repository';

interface SocketData {
  participantId?: string;
  roomId?: string;
  displayName?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // In production, specify your frontend URL
    credentials: true,
  },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalingGateway.name);

  private socketToParticipant = new Map<string, SocketData>();

  constructor(private readonly participantRepository: ParticipantRepository) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const data = this.socketToParticipant.get(client.id);
    if (data?.roomId && data?.participantId) {
      await this.participantRepository.markAsLeft(data.participantId);

      client.to(data.roomId).emit(SignalingEventType.PARTICIPANT_LEFT, {
        participantId: data.participantId,
        roomId: data.roomId,
      });

      this.socketToParticipant.delete(client.id);
    }
  }

  @SubscribeMessage(SignalingEventType.JOIN_ROOM)
  async handleJoinRoom(
    @MessageBody() data: JoinRoomDto & { participantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, participantId, displayName } = data;

    this.logger.log(`Participant ${participantId} joining room ${roomId}`);

    this.socketToParticipant.set(client.id, {
      participantId,
      roomId,
      displayName,
    });

    await client.join(roomId);

    client.to(roomId).emit(SignalingEventType.PARTICIPANT_JOINED, {
      participant: {
        id: participantId,
        displayName,
        type: data.type || 'user',
        role: 'participant',
      },
      roomId,
    });

    return { success: true, roomId, participantId };
  }

  @SubscribeMessage(SignalingEventType.LEAVE_ROOM)
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; participantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, participantId } = data;

    this.logger.log(`Participant ${participantId} leaving room ${roomId}`);

    await client.leave(roomId);

    client.to(roomId).emit(SignalingEventType.PARTICIPANT_LEFT, {
      participantId,
      roomId,
    });

    this.socketToParticipant.delete(client.id);

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.OFFER)
  handleOffer(
    @MessageBody() data: WebRTCOffer & { targetParticipantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { targetParticipantId, participantId, roomId, sdp } = data;

    this.logger.log(`Relaying offer from ${participantId} to ${targetParticipantId}`);

    const targetSocket = this.findSocketByParticipantId(targetParticipantId, roomId);

    if (targetSocket) {
      this.server.to(targetSocket).emit(SignalingEventType.OFFER, {
        participantId,
        roomId,
        sdp,
      });
    }

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.ANSWER)
  handleAnswer(
    @MessageBody() data: WebRTCAnswer & { targetParticipantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { targetParticipantId, participantId, roomId, sdp } = data;

    this.logger.log(`Relaying answer from ${participantId} to ${targetParticipantId}`);

    const targetSocket = this.findSocketByParticipantId(targetParticipantId, roomId);

    if (targetSocket) {
      this.server.to(targetSocket).emit(SignalingEventType.ANSWER, {
        participantId,
        roomId,
        sdp,
      });
    }

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.ICE_CANDIDATE)
  handleIceCandidate(
    @MessageBody() data: WebRTCIceCandidate & { targetParticipantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { targetParticipantId, participantId, roomId, candidate } = data;

    this.logger.log(`Relaying ICE candidate from ${participantId} to ${targetParticipantId}`);

    const targetSocket = this.findSocketByParticipantId(targetParticipantId, roomId);

    if (targetSocket) {
      this.server.to(targetSocket).emit(SignalingEventType.ICE_CANDIDATE, {
        participantId,
        roomId,
        candidate,
      });
    }

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.TOGGLE_VIDEO)
  handleToggleVideo(
    @MessageBody() data: MediaStateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, participantId, videoEnabled } = data;

    this.logger.log(`Participant ${participantId} toggled video: ${videoEnabled}`);

    client.to(roomId).emit(SignalingEventType.TOGGLE_VIDEO, {
      participantId,
      videoEnabled,
    });

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.TOGGLE_AUDIO)
  handleToggleAudio(
    @MessageBody() data: MediaStateDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, participantId, audioEnabled } = data;

    this.logger.log(`Participant ${participantId} toggled audio: ${audioEnabled}`);

    client.to(roomId).emit(SignalingEventType.TOGGLE_AUDIO, {
      participantId,
      audioEnabled,
    });

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.SCREEN_SHARE_START)
  handleScreenShareStart(
    @MessageBody() data: { roomId: string; participantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, participantId } = data;

    this.logger.log(`Participant ${participantId} started screen sharing`);

    client.to(roomId).emit(SignalingEventType.SCREEN_SHARE_START, {
      participantId,
    });

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.SCREEN_SHARE_STOP)
  handleScreenShareStop(
    @MessageBody() data: { roomId: string; participantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, participantId } = data;

    this.logger.log(`Participant ${participantId} stopped screen sharing`);

    client.to(roomId).emit(SignalingEventType.SCREEN_SHARE_STOP, {
      participantId,
    });

    return { success: true };
  }

  @SubscribeMessage(SignalingEventType.CHAT_MESSAGE)
  handleChatMessage(
    @MessageBody() data: SendMessageDto & { participantId: string; senderName?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, content, participantId, senderName } = data;

    this.logger.log(`Chat message in room ${roomId} from ${participantId}`);

    this.server.to(roomId).emit(SignalingEventType.CHAT_MESSAGE, {
      roomId,
      participantId,
      content,
      senderName,
      sentAt: new Date(),
    });

    return { success: true };
  }

  private findSocketByParticipantId(participantId: string, roomId: string): string | null {
    for (const [socketId, data] of this.socketToParticipant.entries()) {
      if (data.participantId === participantId && data.roomId === roomId) {
        return socketId;
      }
    }
    return null;
  }
}
