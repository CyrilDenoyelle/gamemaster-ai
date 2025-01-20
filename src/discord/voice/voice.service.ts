import { Injectable, Logger } from '@nestjs/common';
import {
  joinVoiceChannel,
  VoiceConnection,
  createAudioPlayer,
  AudioPlayerStatus,
} from '@discordjs/voice';
import { VoiceBasedChannel, VoiceChannel } from 'discord.js';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private connections = new Map<string, VoiceConnection>(); // Guild ID -> VoiceConnection
  private audioPlayer = createAudioPlayer();

  constructor() {
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

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    this.logger.log(`Joined voice channel: ${channel.name}`);
    return connection;
  }
}
