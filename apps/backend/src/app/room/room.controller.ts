import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomService } from '../../application/services/room.service';
import {
  CreateRoomDto,
  JoinRoomDto,
  RoomDto,
  ParticipantDto,
  MessageDto,
} from '@cme/shared';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRoom(@Body() dto: CreateRoomDto): Promise<RoomDto> {
    return this.roomService.createRoom(dto);
  }

  @Get()
  async getActiveRooms(): Promise<RoomDto[]> {
    return this.roomService.getActiveRooms();
  }

  @Get(':roomId')
  async getRoomById(@Param('roomId') roomId: string): Promise<RoomDto> {
    return this.roomService.getRoomById(roomId);
  }

  @Post(':roomId/join')
  @HttpCode(HttpStatus.OK)
  async joinRoom(
    @Param('roomId') roomId: string,
    @Body() dto: Omit<JoinRoomDto, 'roomId'>,
  ): Promise<ParticipantDto> {
    return this.roomService.joinRoom({ ...dto, roomId });
  }

  @Delete(':roomId/participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveRoom(
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: string,
  ): Promise<void> {
    return this.roomService.leaveRoom(roomId, participantId);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endRoom(@Param('roomId') roomId: string): Promise<void> {
    return this.roomService.endRoom(roomId);
  }

  @Get(':roomId/participants')
  async getRoomParticipants(@Param('roomId') roomId: string): Promise<ParticipantDto[]> {
    return this.roomService.getRoomParticipants(roomId);
  }

  @Get(':roomId/messages')
  async getRoomMessages(@Param('roomId') roomId: string): Promise<MessageDto[]> {
    return this.roomService.getRoomMessages(roomId);
  }
}
