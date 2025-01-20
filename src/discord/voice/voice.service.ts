import { Injectable, Logger } from '@nestjs/common';
import {
  joinVoiceChannel,
  VoiceConnection,
  createAudioPlayer,
  AudioPlayerStatus,
} from '@discordjs/voice';
import { Guild, VoiceBasedChannel, VoiceChannel } from 'discord.js';
import { join } from 'path';
import { writeFileSync } from 'fs';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private connections = new Map<string, VoiceConnection>(); // Guild ID -> VoiceConnection
  private audioPlayer = createAudioPlayer();
  readonly storageFile = join(__dirname, '../../../connected-channels.json');

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

    this.connections.set(channel.guild.id, connection);
    // log connections ids
    this.saveConnectedChannels();
    return connection;
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
