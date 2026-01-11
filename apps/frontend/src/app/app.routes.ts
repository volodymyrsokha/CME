import { Route } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { VideoRoomComponent } from './components/video-room/video-room.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'room/:roomId',
    component: VideoRoomComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
