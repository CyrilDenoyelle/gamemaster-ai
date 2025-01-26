import { Injectable, Logger } from '@nestjs/common';
import {
  joinVoiceChannel,
  VoiceConnection,
  createAudioPlayer,
  AudioPlayerStatus,
  EndBehaviorType,
  AudioReceiveStream,
  VoiceReceiver,
} from '@discordjs/voice';
import { Guild, VoiceBasedChannel, VoiceChannel, VoiceState } from 'discord.js';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';
import { OpusEncoder } from '@discordjs/opus';

import { spawn } from 'child_process';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private connections = new Map<string, VoiceConnection>(); // Guild ID -> VoiceConnection
  private audioPlayer = createAudioPlayer();
  private activeStreams = new Map<string, AudioReceiveStream>(); // User ID -> AudioReceiveStream
  readonly storageFile = join(__dirname, '../../../connected-channels.json');
  encoder = new OpusEncoder(48000, 1);
  sttProcesses = new Map<string, ReturnType<typeof spawn>>(); // User ID -> spawn (Speech to text process)

  constructor(private audioStreamGateway: AudioStreamGateway) {
    // Log player events for debugging
    this.audioPlayer.on(AudioPlayerStatus.Idle, () =>
      this.logger.log('Audio player is idle'),
    );
    this.audioPlayer.on(AudioPlayerStatus.Playing, () =>
      this.logger.log('Audio player is playing'),
    );
  }

  /**
   * Joins a voice channel and returns the VoiceConnection.
   * @param voiceChannel The Discord voice channel to join.
   */
  joinChannel(channel: VoiceBasedChannel): VoiceConnection | null {
    // users in the channel
    const users = channel.members.filter((member) => !member.user.bot);

    // create a speech to text instace foreach users
    users.forEach((user) => {
      const sttProcess = this.spawnInstance(user.id);
      this.sttProcesses.set(user.id, sttProcess);
    });

    if (!(channel instanceof VoiceChannel)) {
      this.logger.warn(
        `Cannot join non-standard voice channels like: ${channel.name}`,
      );
      return null;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    this.logger.log(`Joined voice channel: ${channel.name}`);

    this.connections.set(channel.guild.id, connection);
    // log connections ids
    this.saveConnectedChannels();

    // Start listening for user audio
    this.listenToUserAudio(connection);

    return connection;
  }

  handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const user = oldState.member.user;
    if (user.bot) return;
    // current voice channel of the bot
    const currentConnection = this.connections.get(newState.guild.id);

    if (
      !this.sttProcesses.has(user.id) &&
      newState.channelId === currentConnection?.joinConfig.channelId
    ) {
      const sttProcess = this.spawnInstance(user.id);
      this.sttProcesses.set(user.id, sttProcess);
    } else if (
      this.sttProcesses.has(user.id) &&
      newState.channelId !== currentConnection?.joinConfig.channelId
    ) {
      this.sttProcesses.get(user.id)?.kill();
      this.sttProcesses.delete(user.id);
    }

    return;
  }

  /**
   * Spawns a Vosk instance for a user.
   * @param userId The ID of the user.
   */
  spawnInstance(userId: string): ReturnType<typeof spawn> {
    const sttProcess = spawn('python', [
      join(__dirname, '../../../vosk/voskSocketClient.py'),
      '--userId',
      userId,
    ]);
    this.logger.log(`Vosk process for user ${userId} started`);

    sttProcess.on('close', (code) => {
      this.logger.log(
        `Vosk process for user ${userId} exited with code: ${code}`,
      );
    });
    return sttProcess;
  }
  /**
   * Listens to user audio in a voice connection.
   * @param connection The voice connection to listen on.
   */
  private listenToUserAudio(connection: VoiceConnection) {
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId: string) => {
      // avoid multiple start for the same user
      if (this.activeStreams.has(userId)) return;

      // Create a stream to capture the audio from the user
      const audioStream = this.createUserAudioStreamGateway(receiver, userId);
      this.activeStreams.set(userId, audioStream);

      // Convert the audio stream from Opus to PCM and send it to the WebSocket server
      audioStream.on('data', (audioData: Buffer) => {
        // Broadcast to WebSocket clients
        this.audioStreamGateway.broadcastAudio(this.encoder.decode(audioData));
      });

      // Clean up when the stream ends
      audioStream.on('end', () => {
        this.cleanupStream(userId);
      });
    });
  }

  /**
   * Creates a readable audio stream for a specific user.
   * @param receiver The VoiceReceiver instance.
   * @param userId The ID of the user.
   * @returns A readable stream for the user's audio.
   */
  private createUserAudioStreamGateway(
    receiver: VoiceReceiver,
    userId: string,
  ): AudioReceiveStream {
    return receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000, // Stop after 1 second of silence
      },
    });
  }

  /**
   * Cleans up when the user stops speaking or leaves the channel.
   * @param userId The ID of the user whose stream needs to be cleaned up.
   */
  private cleanupStream(userId: string) {
    const audioStream = this.activeStreams.get(userId);
    if (audioStream) {
      audioStream.destroy();
      this.activeStreams.delete(userId);
    }
  }

  /**
   * Leaves the voice channel in the specified guild and updates storage.
   * @param guild The Discord guild to disconnect from.
   */
  leaveChannel(guild: Guild) {
    const connection = this.connections.get(guild.id);
    if (connection) {
      connection.disconnect();
      this.connections.delete(guild.id);
      this.logger.log(`Left the voice channel in guild ${guild.id}`);
      this.saveConnectedChannels();
    } else {
      this.logger.warn(
        `No active voice connection found for guild ${guild.id}`,
      );
    }
  }

  /**
   * Saves the connected channels to a file.
   */
  private saveConnectedChannels() {
    const data = Array.from(this.connections.keys()).map((guildId) => {
      const connection = this.connections.get(guildId);
      return {
        guildId,
        channelId: connection?.joinConfig.channelId,
      };
    });

    writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
    this.logger.log('Connected channels saved to storage.');
  }
}
