import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, GatewayIntentBits, VoiceChannel } from 'discord.js';
import { MessageService } from './message/message.service';
import { existsSync, readFileSync } from 'fs';
import { VoiceService } from './voice/voice.service';

@Injectable()
export class DiscordClientService implements OnModuleInit, OnModuleDestroy {
  private client: Client;

  constructor(
    private readonly messageService: MessageService,
    private readonly voiceService: VoiceService,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });
  }

  async onModuleInit() {
    console.log('Initializing Discord Bot...');
    this.client.once('ready', () => {
      console.log(`Logged in as ${this.client.user?.tag}`);
      this.loadConnectedChannels();
    });

    this.client.on('messageCreate', (message) => {
      this.messageService.handleMessage(message);
    });

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  async onModuleDestroy() {
    console.log('Destroying Discord Bot...');
    await this.client.destroy();
  }

  /**
   * Loads connected channels from storage and reconnects.
   */
  private async loadConnectedChannels() {
    if (!existsSync(this.voiceService.storageFile)) return;
    const data = JSON.parse(
      readFileSync(this.voiceService.storageFile, 'utf-8'),
    );
    console.log(readFileSync(this.voiceService.storageFile, 'utf-8'));
    for (const { guildId, channelId } of data) {
      const guild = await this.getGuildById(guildId);
      const channel = guild?.channels.resolve(channelId) as VoiceChannel;

      if (channel) {
        this.voiceService.joinChannel(channel);
      }
    }
  }

  /**
   * Helper to get a guild by its ID.
   * @param guildId The ID of the guild.
   */
  private async getGuildById(guildId: string) {
    const client = this.client;
    if (!client) {
      return null;
    }
    return client.guilds.resolve(guildId);
  }
}
