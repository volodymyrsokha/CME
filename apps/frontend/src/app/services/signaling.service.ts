import { Injectable, inject, signal } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { Observable, Subject, fromEvent } from 'rxjs';
import {
  SignalingEventType,
  WebRTCOffer,
  WebRTCAnswer,
  WebRTCIceCandidate,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
  MessageDto,
} from '@cme/shared';
import { environment } from '../../environments/environment';

export enum ConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

@Injectable({
  providedIn: 'root',
})
export class SignalingService {
  private socket: Socket | null = null;
  private connected$ = new Subject<boolean>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  connectionStatus = signal<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  isConnected = signal<boolean>(false);

  private participantJoined$ = new Subject<ParticipantJoinedEvent>();
  private participantLeft$ = new Subject<ParticipantLeftEvent>();
  private offer$ = new Subject<WebRTCOffer>();
  private answer$ = new Subject<WebRTCAnswer>();
  private iceCandidate$ = new Subject<WebRTCIceCandidate>();
  private chatMessage$ = new Subject<MessageDto>();
  private videoToggled$ = new Subject<{ participantId: string; videoEnabled: boolean }>();
  private audioToggled$ = new Subject<{ participantId: string; audioEnabled: boolean }>();
  private screenShareStarted$ = new Subject<{ participantId: string }>();
  private screenShareStopped$ = new Subject<{ participantId: string }>();

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.connectionStatus.set(ConnectionStatus.CONNECTING);

    this.socket = io(environment.wsUrl || 'http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false,
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.connected$.next(true);
      this.connectionStatus.set(ConnectionStatus.CONNECTED);
      this.isConnected.set(true);
      this.reconnectAttempts = 0;

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from signaling server:', reason);
      this.connected$.next(false);
      this.isConnected.set(false);
      this.connectionStatus.set(ConnectionStatus.DISCONNECTED);

      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        return;
      }

      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.connectionStatus.set(ConnectionStatus.ERROR);
      this.isConnected.set(false);
      this.attemptReconnect();
    });

    this.setupEventListeners();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionStatus.set(ConnectionStatus.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.connectionStatus.set(ConnectionStatus.RECONNECTING);

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    this.reconnectTimeout = window.setTimeout(() => {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.connect();
    }, delay);
  }

  resetConnection(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus.set(ConnectionStatus.DISCONNECTED);
    this.isConnected.set(false);
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionStatus.set(ConnectionStatus.DISCONNECTED);
    this.isConnected.set(false);
  }

  joinRoom(
    roomId: string,
    participantId: string,
    displayName?: string,
    type: 'user' | 'ai_agent' = 'user'
  ): void {
    this.socket?.emit(SignalingEventType.JOIN_ROOM, {
      roomId,
      participantId,
      displayName,
      type,
    });
  }

  leaveRoom(roomId: string, participantId: string): void {
    this.socket?.emit(SignalingEventType.LEAVE_ROOM, {
      roomId,
      participantId,
    });
  }

  sendOffer(offer: WebRTCOffer & { targetParticipantId: string }): void {
    this.socket?.emit(SignalingEventType.OFFER, offer);
  }

  sendAnswer(answer: WebRTCAnswer & { targetParticipantId: string }): void {
    this.socket?.emit(SignalingEventType.ANSWER, answer);
  }

  sendIceCandidate(candidate: WebRTCIceCandidate & { targetParticipantId: string }): void {
    this.socket?.emit(SignalingEventType.ICE_CANDIDATE, candidate);
  }

  toggleVideo(roomId: string, participantId: string, videoEnabled: boolean): void {
    this.socket?.emit(SignalingEventType.TOGGLE_VIDEO, {
      roomId,
      participantId,
      videoEnabled,
      audioEnabled: true, // Required by MediaStateDto
      screenSharing: false,
    });
  }

  toggleAudio(roomId: string, participantId: string, audioEnabled: boolean): void {
    this.socket?.emit(SignalingEventType.TOGGLE_AUDIO, {
      roomId,
      participantId,
      audioEnabled,
      videoEnabled: true, // Required by MediaStateDto
      screenSharing: false,
    });
  }

  startScreenShare(roomId: string, participantId: string): void {
    this.socket?.emit(SignalingEventType.SCREEN_SHARE_START, {
      roomId,
      participantId,
    });
  }

  stopScreenShare(roomId: string, participantId: string): void {
    this.socket?.emit(SignalingEventType.SCREEN_SHARE_STOP, {
      roomId,
      participantId,
    });
  }

  sendChatMessage(
    roomId: string,
    participantId: string,
    content: string,
    senderName?: string
  ): void {
    this.socket?.emit(SignalingEventType.CHAT_MESSAGE, {
      roomId,
      participantId,
      content,
      senderName,
    });
  }

  get onConnected$(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  get onParticipantJoined$(): Observable<ParticipantJoinedEvent> {
    return this.participantJoined$.asObservable();
  }

  get onParticipantLeft$(): Observable<ParticipantLeftEvent> {
    return this.participantLeft$.asObservable();
  }

  get onOffer$(): Observable<WebRTCOffer> {
    return this.offer$.asObservable();
  }

  get onAnswer$(): Observable<WebRTCAnswer> {
    return this.answer$.asObservable();
  }

  get onIceCandidate$(): Observable<WebRTCIceCandidate> {
    return this.iceCandidate$.asObservable();
  }

  get onChatMessage$(): Observable<MessageDto> {
    return this.chatMessage$.asObservable();
  }

  get onVideoToggled$(): Observable<{ participantId: string; videoEnabled: boolean }> {
    return this.videoToggled$.asObservable();
  }

  get onAudioToggled$(): Observable<{ participantId: string; audioEnabled: boolean }> {
    return this.audioToggled$.asObservable();
  }

  get onScreenShareStarted$(): Observable<{ participantId: string }> {
    return this.screenShareStarted$.asObservable();
  }

  get onScreenShareStopped$(): Observable<{ participantId: string }> {
    return this.screenShareStopped$.asObservable();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on(
      SignalingEventType.PARTICIPANT_JOINED,
      (data: ParticipantJoinedEvent) => {
        this.participantJoined$.next(data);
      }
    );

    this.socket.on(SignalingEventType.PARTICIPANT_LEFT, (data: ParticipantLeftEvent) => {
      this.participantLeft$.next(data);
    });

    this.socket.on(SignalingEventType.OFFER, (data: WebRTCOffer) => {
      this.offer$.next(data);
    });

    this.socket.on(SignalingEventType.ANSWER, (data: WebRTCAnswer) => {
      this.answer$.next(data);
    });

    this.socket.on(SignalingEventType.ICE_CANDIDATE, (data: WebRTCIceCandidate) => {
      this.iceCandidate$.next(data);
    });

    this.socket.on(SignalingEventType.CHAT_MESSAGE, (data: MessageDto) => {
      this.chatMessage$.next(data);
    });

    this.socket.on(
      SignalingEventType.TOGGLE_VIDEO,
      (data: { participantId: string; videoEnabled: boolean }) => {
        this.videoToggled$.next(data);
      }
    );

    this.socket.on(
      SignalingEventType.TOGGLE_AUDIO,
      (data: { participantId: string; audioEnabled: boolean }) => {
        this.audioToggled$.next(data);
      }
    );

    this.socket.on(
      SignalingEventType.SCREEN_SHARE_START,
      (data: { participantId: string }) => {
        this.screenShareStarted$.next(data);
      }
    );

    this.socket.on(
      SignalingEventType.SCREEN_SHARE_STOP,
      (data: { participantId: string }) => {
        this.screenShareStopped$.next(data);
      }
    );
  }
}
