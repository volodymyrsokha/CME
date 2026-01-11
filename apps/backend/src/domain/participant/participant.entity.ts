import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ParticipantRole, ParticipantType } from '@cme/shared';
import { Room } from '../room/room.entity';
import { Message } from '../message/message.entity';

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room, (room) => room.participants)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @Column({
    type: 'enum',
    enum: ParticipantType,
    default: ParticipantType.USER,
  })
  type: ParticipantType;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.PARTICIPANT,
  })
  role: ParticipantRole;

  @Column({ name: 'display_name', nullable: true })
  displayName: string | null;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date | null;

  @Column({ name: 'video_enabled', default: true })
  videoEnabled: boolean;

  @Column({ name: 'audio_enabled', default: true })
  audioEnabled: boolean;

  @Column({ name: 'screen_sharing', default: false })
  screenSharing: boolean;

  @OneToMany(() => Message, (message) => message.participant)
  messages: Message[];
}
