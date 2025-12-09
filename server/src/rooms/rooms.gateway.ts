import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomState } from './rooms.types';

// CORS: разрешаем только доверенные origins
const FRONTEND_URLS = [
  'http://localhost:3001',
  'https://codeshare-murex.vercel.app', // ← замените на ваш Vercel URL
  // Можно добавить другие
].filter(Boolean);

@WebSocketGateway({
  cors: {
    origin: FRONTEND_URLS,
    credentials: false,
  },
  // НЕТ namespace — используем корень
})
export class RoomsGateway {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, RoomState>();

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomId: string,
  ) {
    if (!roomId || typeof roomId !== 'string' || roomId.length < 3) {
      client.disconnect(true);
      return;
    }

    client.join(roomId);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        code: '// Start coding here...\nconsole.log("Hello, interview!");',
        language: 'typescript',
      });
    }

    const roomState = this.rooms.get(roomId)!;
    client.emit('roomState', roomState.code);
  }

  @SubscribeMessage('codeChange')
  handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; code: string },
  ) {
    const { roomId, code } = payload;

    if (!roomId || !this.rooms.has(roomId) || typeof code !== 'string') {
      return;
    }

    const current = this.rooms.get(roomId)!;
    this.rooms.set(roomId, { ...current, code });

    client.to(roomId).emit('codeUpdate', code);
  }
}