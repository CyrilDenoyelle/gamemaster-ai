import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway(8080, {
  cors: {
    origin: '*',
  },
})
export class AudioStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private activeClients: Set<Socket> = new Set();
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
   * When a client connects, add them to the active clients list
   * @param socket The socket of the connecting client
   */
  handleConnection(socket: Socket) {
    this.activeClients.add(socket);
    this.logger.log('Client connected:', socket.id);
  }

  /**
   * When a client connection is refused, log the error
   * @param socket The socket of the connecting client
   */
  handleConnectionRefused(socket: Socket) {
    this.logger.warn('Connection refused:', socket.id);
  }

  /**
   * When a client disconnects, remove them from the active clients list
   * @param socket The socket of the disconnected client
   */
  handleDisconnect(socket: Socket) {
    this.activeClients.delete(socket);
    this.logger.log('Client disconnected:', socket.id);
  }
}
