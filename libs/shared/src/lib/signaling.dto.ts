// WebRTC Signaling DTOs

export enum SignalingEventType {
  // Connection events
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  PARTICIPANT_JOINED = 'participant-joined',
  PARTICIPANT_LEFT = 'participant-left',

  // WebRTC signaling
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',

  // Media control
  TOGGLE_VIDEO = 'toggle-video',
  TOGGLE_AUDIO = 'toggle-audio',
  SCREEN_SHARE_START = 'screen-share-start',
  SCREEN_SHARE_STOP = 'screen-share-stop',

  // Chat
  CHAT_MESSAGE = 'chat-message',

  // Room events
  ROOM_ENDED = 'room-ended',
}

export interface WebRTCOffer {
  participantId: string;
  roomId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCAnswer {
  participantId: string;
  roomId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidate {
  participantId: string;
  roomId: string;
  candidate: RTCIceCandidateInit;
}

export interface MediaStateDto {
  participantId: string;
  roomId: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
}

export interface ParticipantJoinedEvent {
  participant: {
    id: string;
    displayName?: string;
    type: string;
    role: string;
  };
  roomId: string;
}

export interface ParticipantLeftEvent {
  participantId: string;
  roomId: string;
}
