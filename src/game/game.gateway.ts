import { forwardRef, Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GameServiceFactory } from './gameServiceFactory';

@WebSocketGateway(8000, {
  cors: {
    origin: '*',
  },
})
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(GameGateway.name);
  private clients: Set<any> = new Set();

  constructor(
    @Inject(forwardRef(() => 'GameServiceFactory'))
    private gameServiceFactory: GameServiceFactory,
  ) {}

  sendGame() {
    const game = this.gameServiceFactory.getGame();
    if (!game) {
      return;
    }
    this.clients.forEach((client) => {
      client.emit('chats', game);
    });
  }

  afterInit() {
    this.logger.log('WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    this.clients.add(client);
    this.sendGame();
    this.logger.log('Client connected:', { clientId: client.id });
  }

  handleDisconnect(client: any) {
    this.clients.delete(client);
    this.logger.log('Client disconnected:', { clientId: client.id });
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    this.logger.log('Received message from client:', {
      clientId: client.id,
      payload: payload,
    });
    this.gameServiceFactory.sendMessage({ ...payload, role: 'user' });
  }
}
