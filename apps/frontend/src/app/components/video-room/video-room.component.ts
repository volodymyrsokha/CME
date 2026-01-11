import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SignalingService } from '../../services/signaling.service';
import { WebRTCService } from '../../services/webrtc.service';
import { RoomService } from '../../services/room.service';
import { ParticipantDto, MessageDto, ParticipantType } from '@cme/shared';

@Component({
  selector: 'app-video-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-room.component.html',
  styleUrls: ['./video-room.component.scss'],
})
export class VideoRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private signalingService = inject(SignalingService);
  private webrtcService = inject(WebRTCService);
  private roomService = inject(RoomService);

  roomId = signal<string | null>(null);
  participantId = signal<string | null>(null);
  displayName = signal<string>('');
  localStream = signal<MediaStream | null>(null);
  participants = signal<ParticipantDto[]>([]);
  messages = signal<MessageDto[]>([]);
  chatMessage = signal<string>('');
  error = signal<string | null>(null);
  isLoading = signal<boolean>(true);

  remoteStreams = computed(() => this.webrtcService.remoteStreams());
  isVideoEnabled = computed(() => this.webrtcService.isVideoEnabled());
  isAudioEnabled = computed(() => this.webrtcService.isAudioEnabled());
  isScreenSharing = computed(() => this.webrtcService.isScreenSharing());

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    const displayName = this.route.snapshot.queryParamMap.get('name') || 'Anonymous';

    if (!roomId) {
      this.router.navigate(['/']);
      return;
    }

    this.roomId.set(roomId);
    this.displayName.set(displayName);

    this.initializeRoom();
  }

  ngOnDestroy(): void {
    this.leaveRoom();
  }

  private async initializeRoom(): Promise<void> {
    try {
      this.signalingService.connect();

      const stream = await this.webrtcService.initializeMedia();
      this.localStream.set(stream);

      const participant = await this.roomService
        .joinRoom(this.roomId()!, {
          displayName: this.displayName(),
          type: ParticipantType.USER,
        })
        .toPromise();

      if (participant) {
        this.participantId.set(participant.id);

        this.signalingService.joinRoom(
          this.roomId()!,
          participant.id,
          this.displayName()
        );

        await this.loadParticipants();

        await this.loadMessages();

        this.setupEventListeners();

        this.connectToExistingParticipants();
      }

      this.isLoading.set(false);
    } catch (error) {
      console.error('Failed to initialize room:', error);
      this.error.set('Failed to join the room. Please try again.');
      this.isLoading.set(false);
    }
  }

  private async loadParticipants(): Promise<void> {
    try {
      const participants = await this.roomService
        .getRoomParticipants(this.roomId()!)
        .toPromise();

      if (participants) {
        const others = participants.filter((p) => p.id !== this.participantId());
        this.participants.set(others);
      }
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  }

  private async loadMessages(): Promise<void> {
    try {
      const messages = await this.roomService
        .getRoomMessages(this.roomId()!)
        .toPromise();

      if (messages) {
        this.messages.set(messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  private setupEventListeners(): void {
    this.signalingService.onParticipantJoined$.subscribe((event) => {
      console.log('Participant joined:', event.participant);

      this.participants.update((participants) => [
        ...participants,
        event.participant as ParticipantDto,
      ]);

      this.webrtcService.createOffer(
        event.participant.id,
        this.roomId()!,
        this.participantId()!
      );
    });

    this.signalingService.onParticipantLeft$.subscribe((event) => {
      console.log('Participant left:', event.participantId);

      this.participants.update((participants) =>
        participants.filter((p) => p.id !== event.participantId)
      );
    });

    this.signalingService.onChatMessage$.subscribe((message) => {
      this.messages.update((messages) => [...messages, message]);
    });

    this.signalingService.onVideoToggled$.subscribe(({ participantId, videoEnabled }) => {
      console.log(`Participant ${participantId} video: ${videoEnabled}`);
    });

    this.signalingService.onAudioToggled$.subscribe(({ participantId, audioEnabled }) => {
      console.log(`Participant ${participantId} audio: ${audioEnabled}`);
    });
  }

  private connectToExistingParticipants(): void {
    this.participants().forEach((participant) => {
      this.webrtcService.createOffer(
        participant.id,
        this.roomId()!,
        this.participantId()!
      );
    });
  }

  toggleVideo(): void {
    this.webrtcService.toggleVideo();
  }

  toggleAudio(): void {
    this.webrtcService.toggleAudio();
  }

  async toggleScreenShare(): Promise<void> {
    if (this.isScreenSharing()) {
      this.webrtcService.stopScreenShare();
    } else {
      try {
        await this.webrtcService.startScreenShare();
      } catch (error) {
        console.error('Failed to start screen share:', error);
      }
    }
  }

  sendMessage(): void {
    const content = this.chatMessage().trim();

    if (!content) return;

    this.signalingService.sendChatMessage(
      this.roomId()!,
      this.participantId()!,
      content,
      this.displayName()
    );

    this.chatMessage.set('');
  }

  leaveRoom(): void {
    const roomId = this.roomId();
    const participantId = this.participantId();

    if (roomId && participantId) {
      this.signalingService.leaveRoom(roomId, participantId);

      this.roomService.leaveRoom(roomId, participantId).subscribe();
    }

    this.webrtcService.cleanup();

    this.signalingService.disconnect();
    this.router.navigate(['/']);
  }

  onChatKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getParticipantName(participantId: string): string {
    const participant = this.participants().find((p) => p.id === participantId);
    return participant?.displayName || 'Unknown';
  }
}
