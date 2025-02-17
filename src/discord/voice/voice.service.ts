import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  joinVoiceChannel,
  VoiceConnection,
  createAudioPlayer,
  AudioPlayerStatus,
  EndBehaviorType,
  AudioReceiveStream,
  VoiceReceiver,
  createAudioResource,
} from '@discordjs/voice';
import { Guild, VoiceBasedChannel, VoiceChannel, VoiceState } from 'discord.js';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { AudioStreamGateway } from '../../audiostream/audiostream.gateway';
import { OpusEncoder } from '@discordjs/opus';

import { spawn } from 'child_process';
import { GameService } from 'src/game/game.service';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  connection: VoiceConnection; // Guild ID -> VoiceConnection
  private audioPlayer = createAudioPlayer();
  private activeStreams = new Map<string, AudioReceiveStream>(); // User ID -> AudioReceiveStream
  readonly storageFile = join(__dirname, '../../../connected-channel.json');
  encoder = new OpusEncoder(48000, 1);
  childProcesses = new Map<string, ReturnType<typeof spawn>>(); // User ID -> spawn (Speech to text process)

  constructor(
    @Inject(forwardRef(() => AudioStreamGateway))
    private audioStreamGateway: AudioStreamGateway,
    @Inject(forwardRef(() => GameService))
    private gameService: GameService,
  ) {
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
    if (!(channel instanceof VoiceChannel)) {
      this.logger.warn(
        `Cannot join non-standard voice channels like: ${channel.name}`,
      );
      return null;
    }

    // create a text to speech instance for the bot
    const botId = process.env.BOT_ID;
    const childProcesse = this.spawnTtsInstance(botId, channel.guild.id);
    this.childProcesses.set(botId, childProcesse);

    // users in the channel
    const users = channel.members.filter((member) => !member.user.bot);

    // create a speech to text instace foreach users
    users.forEach((user) => {
      const childProcesse = this.spawnSttInstance(user.id);
      this.childProcesses.set(user.id, childProcesse);
    });

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    this.logger.log(`Joined voice channel: ${channel.name}`);
    this.gameService.setGame(channel.name);

    // log connections ids
    this.saveConnectedChannels();

    // Start listening for user audio
    this.listenToUserAudio(this.connection);

    return this.connection;
  }

  handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const user = oldState.member.user;
    if (user.bot) return;
    // current voice channel of the bot

    if (
      !this.childProcesses.has(user.id) &&
      newState.channelId === this.connection?.joinConfig.channelId
    ) {
      const sttProcess = this.spawnSttInstance(user.id);
      this.childProcesses.set(user.id, sttProcess);
    } else if (
      this.childProcesses.has(user.id) &&
      newState.channelId !== this.connection?.joinConfig.channelId
    ) {
      this.childProcesses.get(user.id)?.kill();
      this.childProcesses.delete(user.id);
    }

    return;
  }

  /**
   * Spawns a Vosk instance for a user.
   * @param userId The ID of the user.
   */
  spawnSttInstance(userId: string): ReturnType<typeof spawn> {
    const sttProcess = spawn('conda', [
      'run',
      '-n',
      'ttsstt',
      'python',
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
   * Spawns a Vosk instance for a user.
   * @param userId The ID of the user.
   */
  spawnTtsInstance(userId: string, guildId: string): ReturnType<typeof spawn> {
    const sttProcess = spawn('conda', [
      'run',
      '-n',
      'cuda_env',
      'python',
      join(__dirname, '../../../melo-tts/meloSocketClient.py'),
      '--userId',
      userId,
      '--guildId',
      guildId,
    ]);

    this.logger.log(`Melo process for user ${userId} started`);

    sttProcess.on('close', (code) => {
      this.logger.log(
        `Melo process for user ${userId} exited with code: ${code}`,
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
        this.audioStreamGateway.broadcastAudio(
          userId,
          this.encoder.decode(audioData),
        );
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
   * Plays an audio file in the voice channel.
   * @param filePath
   */
  play(guildId: string, filePath: string) {
    if (!this.connection) {
      this.logger.warn(`No active voice connection found for guild ${guildId}`);
      return;
    }
    this.connection.subscribe(this.audioPlayer);
    const resource = createAudioResource(filePath);
    this.audioPlayer.play(resource);
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
    if (this.connection) {
      this.connection.disconnect();
      this.childProcesses.forEach((sttProcess) => {
        sttProcess.kill();
      });
      this.childProcesses.clear();
      this.connection = null;
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
    writeFileSync(
      this.storageFile,
      JSON.stringify(
        {
          guildId: this.connection?.joinConfig.guildId,
          channelId: this.connection?.joinConfig.channelId,
        },
        null,
        2,
      ),
    );
    this.logger.log('Connected channels saved to storage.');
  }
}
