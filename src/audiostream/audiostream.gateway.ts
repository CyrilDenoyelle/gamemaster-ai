import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway(80, {
  cors: {
    origin: '*',
  },
})
export class AudioStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private activeClients: Map<string, Socket> = new Map(); // Map<UserId, Socket>
  private readonly logger = new Logger(AudioStreamGateway.name);

  afterInit() {
    this.logger.log('Initialized');
  }

  /**
   * Broadcast audio data to all connected clients
   * @param audioData The audio data to broadcast
   */
  broadcastAudio(audioData: Buffer) {
    // log the buffer length
    this.activeClients.forEach((socket) => {
      socket.emit('audio-stream', audioData);
    });
  }

  /**
   * receive client 'transcribed-text' event
   * @param client
   * @param payload
   */
  @SubscribeMessage('transcribed-text')
  handleTranscribedText(client: Socket, payload: string) {
    const { text } = JSON.parse(payload);
    console.log('client', client.id);
    console.log(`Transcribed text: ${text}`);
  }

  /**
   * When a client connects, add them to the active clients list
   * @param socket The socket of the connecting client
   */
  handleConnection(socket: Socket) {
    const { headers } = socket.handshake;
    if (!headers.user_id) {
      this.handleConnectionRefused(socket, 'no user_id in headers');
      return;
    } else if (typeof headers.user_id == 'string') {
      this.activeClients.set(headers.user_id, socket);
    }
    this.logger.log('Client connected:', socket.id, headers.user_id);
  }

  /**
   * When a client connection is refused, log the error
   * @param socket The socket of the connecting client
   */
  handleConnectionRefused(socket: Socket, reason?: string) {
    this.logger.warn('Connection refused:', socket.id);
    this.logger.warn('reason:', reason);
  }

  /**
   * When a client disconnects, remove them from the active clients list
   * @param socket The socket of the disconnected client
   */
  handleDisconnect(socket: Socket) {
    const headers = socket.handshake.headers;
    if (typeof headers.user_id === 'string') {
      this.activeClients.delete(headers.user_id);
      this.logger.log('Client disconnected:', socket.id);
      return;
    }
  }
}
