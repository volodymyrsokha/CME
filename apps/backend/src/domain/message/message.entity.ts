import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from '../room/room.entity';
import { Participant } from '../participant/participant.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room, (room) => room.messages)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'participant_id' })
  participantId: string;

  @ManyToOne(() => Participant, (participant) => participant.messages)
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
