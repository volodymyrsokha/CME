import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private router = inject(Router);
  private roomService = inject(RoomService);

  displayName = signal<string>('');
  roomIdToJoin = signal<string>('');
  isCreating = signal<boolean>(false);
  error = signal<string | null>(null);

  async createRoom(): Promise<void> {
    const name = this.displayName().trim();

    if (!name) {
      this.error.set('Please enter your name');
      return;
    }

    this.isCreating.set(true);
    this.error.set(null);

    try {
      const room = await this.roomService
        .createRoom({})
        .toPromise();

      if (room) {
        this.router.navigate(['/room', room.id], {
          queryParams: { name },
        });
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      this.error.set('Failed to create room. Please try again.');
    } finally {
      this.isCreating.set(false);
    }
  }

  async joinRoom(): Promise<void> {
    const name = this.displayName().trim();
    const roomId = this.roomIdToJoin().trim();

    if (!name) {
      this.error.set('Please enter your name');
      return;
    }

    if (!roomId) {
      this.error.set('Please enter a room ID');
      return;
    }

    this.error.set(null);

    // Navigate to room
    this.router.navigate(['/room', roomId], {
      queryParams: { name },
    });
  }
}
