import { Injectable, inject, signal } from '@angular/core';
import { SignalingService } from './signaling.service';

export interface PeerConnection {
  participantId: string;
  connection: RTCPeerConnection;
  remoteStream?: MediaStream;
}

export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  UNKNOWN = 'unknown'
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class WebRTCService {
  private signalingService = inject(SignalingService);

  private localStream = signal<MediaStream | null>(null);
  private screenStream = signal<MediaStream | null>(null);

  private peerConnections = new Map<string, RTCPeerConnection>();

  remoteStreams = signal<Map<string, MediaStream>>(new Map());

  isVideoEnabled = signal(true);
  isAudioEnabled = signal(true);
  isScreenSharing = signal(false);

  connectionQuality = signal<ConnectionQuality>(ConnectionQuality.UNKNOWN);
  private statsInterval: number | null = null;

  private roomId: string | null = null;
  private participantId: string | null = null;

  constructor() {
    this.setupSignalingListeners();
    this.startStatsMonitoring();
  }

  private startStatsMonitoring(): void {
    this.statsInterval = window.setInterval(() => {
      this.checkConnectionQuality();
    }, 3000);
  }

  private async checkConnectionQuality(): Promise<void> {
    if (this.peerConnections.size === 0) {
      this.connectionQuality.set(ConnectionQuality.UNKNOWN);
      return;
    }

    let totalPacketLoss = 0;
    let totalRtt = 0;
    let count = 0;

    for (const [participantId, pc] of this.peerConnections) {
      try {
        const stats = await pc.getStats();

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            const packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost);
            if (!isNaN(packetLoss)) {
              totalPacketLoss += packetLoss;
              count++;
            }
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime !== undefined) {
              totalRtt += report.currentRoundTripTime * 1000;
            }
          }
        });
      } catch (error) {
        console.error(`Failed to get stats for ${participantId}:`, error);
      }
    }

    if (count === 0) {
      this.connectionQuality.set(ConnectionQuality.UNKNOWN);
      return;
    }

    const avgPacketLoss = totalPacketLoss / count;
    const avgRtt = totalRtt / count;

    if (avgPacketLoss < 0.02 && avgRtt < 150) {
      this.connectionQuality.set(ConnectionQuality.EXCELLENT);
    } else if (avgPacketLoss < 0.05 && avgRtt < 300) {
      this.connectionQuality.set(ConnectionQuality.GOOD);
    } else if (avgPacketLoss < 0.1 && avgRtt < 500) {
      this.connectionQuality.set(ConnectionQuality.FAIR);
    } else {
      this.connectionQuality.set(ConnectionQuality.POOR);
    }
  }

  async initializeMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.localStream.set(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get local media:', error);
      throw error;
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: false,
      });

      this.screenStream.set(stream);
      this.isScreenSharing.set(true);

      // Listen for screen share stop
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });

      if (this.roomId && this.participantId) {
        this.signalingService.startScreenShare(this.roomId, this.participantId);
      }

      // Replace video track in all peer connections
      this.replaceTrackInAllConnections(stream.getVideoTracks()[0], 'video');

      return stream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }

  stopScreenShare(): void {
    const screenStream = this.screenStream();
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream.set(null);
      this.isScreenSharing.set(false);

      if (this.roomId && this.participantId) {
        this.signalingService.stopScreenShare(this.roomId, this.participantId);
      }

      // Restore camera track
      const localStream = this.localStream();
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        this.replaceTrackInAllConnections(videoTrack, 'video');
      }
    }
  }

  toggleVideo(): void {
    const stream = this.localStream();
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoEnabled.set(videoTrack.enabled);

      if (this.roomId && this.participantId) {
        this.signalingService.toggleVideo(
          this.roomId,
          this.participantId,
          videoTrack.enabled
        );
      }
    }
  }

  toggleAudio(): void {
    const stream = this.localStream();
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isAudioEnabled.set(audioTrack.enabled);

      if (this.roomId && this.participantId) {
        this.signalingService.toggleAudio(
          this.roomId,
          this.participantId,
          audioTrack.enabled
        );
      }
    }
  }

  async createPeerConnection(
    remoteParticipantId: string,
    roomId: string,
    participantId: string
  ): Promise<RTCPeerConnection> {
    this.roomId = roomId;
    this.participantId = participantId;

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks to the connection
    const localStream = this.localStream();
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingService.sendIceCandidate({
          participantId,
          roomId,
          candidate: event.candidate.toJSON(),
          targetParticipantId: remoteParticipantId,
        });
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from', remoteParticipantId);
      const [remoteStream] = event.streams;

      this.remoteStreams.update((streams) => {
        const newStreams = new Map(streams);
        newStreams.set(remoteParticipantId, remoteStream);
        return newStreams;
      });
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state with ${remoteParticipantId}:`,
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'failed') {
        this.removePeerConnection(remoteParticipantId);
      }
    };

    this.peerConnections.set(remoteParticipantId, peerConnection);
    return peerConnection;
  }

  async createOffer(
    remoteParticipantId: string,
    roomId: string,
    participantId: string
  ): Promise<void> {
    let peerConnection = this.peerConnections.get(remoteParticipantId);

    if (!peerConnection) {
      peerConnection = await this.createPeerConnection(
        remoteParticipantId,
        roomId,
        participantId
      );
    }

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.signalingService.sendOffer({
        participantId,
        roomId,
        sdp: offer,
        targetParticipantId: remoteParticipantId,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  async handleOffer(
    remoteParticipantId: string,
    roomId: string,
    participantId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    let peerConnection = this.peerConnections.get(remoteParticipantId);

    if (!peerConnection) {
      peerConnection = await this.createPeerConnection(
        remoteParticipantId,
        roomId,
        participantId
      );
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.signalingService.sendAnswer({
        participantId,
        roomId,
        sdp: answer,
        targetParticipantId: remoteParticipantId,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(
    remoteParticipantId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    const peerConnection = this.peerConnections.get(remoteParticipantId);

    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }

  async handleIceCandidate(
    remoteParticipantId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peerConnection = this.peerConnections.get(remoteParticipantId);

    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  removePeerConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);

    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);

      // Remove remote stream
      this.remoteStreams.update((streams) => {
        const newStreams = new Map(streams);
        newStreams.delete(participantId);
        return newStreams;
      });
    }
  }

  cleanup(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    const localStream = this.localStream();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      this.localStream.set(null);
    }

    this.stopScreenShare();

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.set(new Map());

    this.connectionQuality.set(ConnectionQuality.UNKNOWN);
  }

  getLocalStream(): MediaStream | null {
    return this.localStream();
  }

  private replaceTrackInAllConnections(newTrack: MediaStreamTrack, kind: string): void {
    this.peerConnections.forEach((peerConnection) => {
      const sender = peerConnection
        .getSenders()
        .find((s) => s.track?.kind === kind);

      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  }

  private setupSignalingListeners(): void {
    // Listen for incoming offers
    this.signalingService.onOffer$.subscribe((data) => {
      if (this.roomId && this.participantId) {
        this.handleOffer(data.participantId, data.roomId, this.participantId, data.sdp);
      }
    });

    // Listen for incoming answers
    this.signalingService.onAnswer$.subscribe((data) => {
      this.handleAnswer(data.participantId, data.sdp);
    });

    // Listen for ICE candidates
    this.signalingService.onIceCandidate$.subscribe((data) => {
      this.handleIceCandidate(data.participantId, data.candidate);
    });

    // Listen for participants leaving
    this.signalingService.onParticipantLeft$.subscribe((data) => {
      this.removePeerConnection(data.participantId);
    });
  }
}
