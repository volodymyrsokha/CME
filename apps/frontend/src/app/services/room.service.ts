import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RoomDto,
  ParticipantDto,
  MessageDto,
  CreateRoomDto,
  JoinRoomDto,
} from '@cme/shared';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/rooms`;

  createRoom(dto: CreateRoomDto): Observable<RoomDto> {
    return this.http.post<RoomDto>(this.apiUrl, dto);
  }

  getActiveRooms(): Observable<RoomDto[]> {
    return this.http.get<RoomDto[]>(this.apiUrl);
  }

  getRoomById(roomId: string): Observable<RoomDto> {
    return this.http.get<RoomDto>(`${this.apiUrl}/${roomId}`);
  }

  joinRoom(roomId: string, dto: Omit<JoinRoomDto, 'roomId'>): Observable<ParticipantDto> {
    return this.http.post<ParticipantDto>(`${this.apiUrl}/${roomId}/join`, dto);
  }

  leaveRoom(roomId: string, participantId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${roomId}/participants/${participantId}`);
  }

  endRoom(roomId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${roomId}`);
  }

  getRoomParticipants(roomId: string): Observable<ParticipantDto[]> {
    return this.http.get<ParticipantDto[]>(`${this.apiUrl}/${roomId}/participants`);
  }

  getRoomMessages(roomId: string): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${this.apiUrl}/${roomId}/messages`);
  }
}
