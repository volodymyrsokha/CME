# CME (See Me) - WebRTC Video Conferencing Platform

A full-stack WebRTC video conferencing application built with NestJS backend and Angular frontend in an Nx monorepo.

## 🚀 Features

- **Real-time Video Calls** - Peer-to-peer video conferencing using WebRTC
- **Screen Sharing** - Share your screen during calls
- **In-Call Chat** - Text messaging within video rooms
- **Multiple Rooms** - Create unique rooms for each call
- **AI Integration Ready** - Architecture prepared for AI call summaries and AI participants

## 🏗️ Architecture

### Monorepo Structure

```
CME/
├── apps/
│   ├── backend/              # NestJS backend
│   │   └── src/
│   │       ├── domain/       # Domain entities (Room, Participant, Message)
│   │       ├── application/  # Use cases and DTOs
│   │       ├── infrastructure/ # Database, WebSocket, external services
│   │       └── app/          # Application module
│   └── frontend/             # Angular frontend
│       └── src/
│           └── app/          # Components, services, stores
├── libs/
│   └── shared/               # Shared DTOs and interfaces
└── docker-compose.yml        # PostgreSQL setup
```

### Tech Stack

**Backend:**
- NestJS 11
- TypeORM + PostgreSQL
- Socket.IO (WebSocket signaling)
- Domain-Driven Design (DDD)
- Full TypeScript

**Frontend:**
- Angular 21 (standalone components)
- Signals for state management
- Socket.IO client
- WebRTC APIs
- SCSS styling

**Shared:**
- TypeScript DTOs
- Enums and interfaces

## 📦 Getting Started

### Prerequisites

- Node.js 20+ or Bun 1.1+
- Docker & Docker Compose (for PostgreSQL)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd CME
```

2. **Install dependencies**
```bash
bun install
# or
npm install
```

3. **Start PostgreSQL**
```bash
docker-compose up -d
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env if needed
```

5. **Start the development servers**

Backend:
```bash
bun nx serve backend
# or
npx nx serve backend
```

Frontend:
```bash
bun nx serve frontend
# or
npx nx serve frontend
```

The backend will run on `http://localhost:3000` and frontend on `http://localhost:4200`.

## 🗄️ Database

### Schema

**Rooms Table:**
- `id` (UUID, PK)
- `status` (enum: active, ended)
- `created_at` (timestamp)
- `ended_at` (timestamp, nullable)
- `recording_url` (string, nullable)

**Participants Table:**
- `id` (UUID, PK)
- `room_id` (UUID, FK)
- `user_id` (UUID, nullable)
- `type` (enum: user, ai_agent)
- `role` (enum: host, participant)
- `display_name` (string, nullable)
- `joined_at` (timestamp)
- `left_at` (timestamp, nullable)
- `video_enabled` (boolean)
- `audio_enabled` (boolean)
- `screen_sharing` (boolean)

**Messages Table:**
- `id` (UUID, PK)
- `room_id` (UUID, FK)
- `participant_id` (UUID, FK)
- `content` (text)
- `sent_at` (timestamp)

### Migrations

TypeORM is configured with `synchronize: true` in development, so tables are created automatically. For production, use migrations:

```bash
# Generate migration
bun nx run backend:typeorm -- migration:generate -n MigrationName

# Run migrations
bun nx run backend:typeorm -- migration:run
```

## 🔌 WebRTC Flow

1. **Room Creation**
   - User creates a room → Backend generates unique room ID
   - Room stored in PostgreSQL with `active` status

2. **Joining a Room**
   - User joins via WebSocket → Signaling server establishes connection
   - Peer-to-peer SDP offer/answer exchange
   - ICE candidate exchange for NAT traversal

3. **Media Tracks**
   - Video track (camera)
   - Audio track (microphone)
   - Screen sharing track (optional)

4. **Signaling Events**
   - `join-room` - Join a room
   - `leave-room` - Leave a room
   - `offer` / `answer` - WebRTC signaling
   - `ice-candidate` - ICE candidate exchange
   - `chat-message` - Send/receive messages
   - `toggle-video` / `toggle-audio` - Media control
   - `screen-share-start` / `screen-share-stop` - Screen sharing

## 🛠️ Development

### Build the projects

```bash
# Build backend
bun nx build backend

# Build frontend
bun nx build frontend

# Build shared library
bun nx build shared
```

### Run tests

```bash
# Test backend
bun nx test backend

# Test frontend
bun nx test frontend
```

### Lint

```bash
# Lint all projects
bun nx run-many --target=lint --all
```

### Nx Graph

Visualize project dependencies:
```bash
bun nx graph
```

## 📝 Environment Variables

See [.env.example](.env.example) for all available configuration options.

## 🤝 Contributing

This is a pet project, but contributions are welcome!

## 📄 License

MIT

## 🔗 Links

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://nestjs.com)
- [Angular Documentation](https://angular.dev)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
