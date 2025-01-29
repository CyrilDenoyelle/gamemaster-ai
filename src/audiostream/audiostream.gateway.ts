import { forwardRef, Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { VoiceService } from 'src/discord/voice/voice.service';

@WebSocketGateway(80, {
  cors: {
    origin: '*',
  },
})
export class AudioStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  constructor(
    @Inject(forwardRef(() => VoiceService))
    private readonly voiceService: VoiceService,
  ) {}
  @WebSocketServer()
  server: Server;

  private activeClients: Map<string, Socket> = new Map(); // Map<UserId, Socket>
  private readonly logger = new Logger(AudioStreamGateway.name);

  afterInit() {
    this.logger.log('Initialized');
  }

  /**
   * Broadcast audio data to userId assigned socket
   * @param audioData The audio data to broadcast
   */
  broadcastAudio(userId: string, audioData: Buffer) {
    // send audio data activeConnections where userId is = userId
    if (!this.activeClients.has(userId)) {
      this.logger.warn(`No active client with id: ${userId}`);
      return;
    }
    this.activeClients.get(userId).emit('audio-stream', audioData);
  }

  /**
   * receive client 'transcribed-text' event
   * @param client
   * @param payload
   */
  @SubscribeMessage('transcribed-text')
  handleTranscribedText(socket: Socket, payload: string) {
    const { text } = JSON.parse(payload);
    const userId = socket.handshake.headers.user_id; // talking user
    console.log('user_id', userId);
    console.log('socket', socket.id);
    console.log(`Transcribed text: ${text}`);
    this.sendText(text);
  }

  /**
   * receive client 'transcribed-audio' event
   * @param client
   * @param payload
   */
  @SubscribeMessage('transcribed-audio')
  handleTranscribedAudio(socket: Socket, filePath: string) {
    console.log('handleTranscribedAudio', filePath);
    const guildId = socket.handshake.headers.guild_id;
    this.voiceService.play(
      Array.isArray(guildId) ? guildId[0] : guildId, // should be guildId
      filePath,
    );
  }

  /**
   * Send text data to handshake.headers user_id connected clients
   * @param text The audio data to broadcast
   */
  sendText(text: string) {
    const userId = process.env.BOT_ID;
    if (!this.activeClients.has(userId)) {
      this.logger.warn(`No active client with id: ${userId}`);
      return;
    }
    this.activeClients.get(userId).emit('text', text);
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
