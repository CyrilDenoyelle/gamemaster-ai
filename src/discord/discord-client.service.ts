import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  Client,
  Events,
  GatewayIntentBits,
  VoiceChannel,
  VoiceState,
} from 'discord.js';
import { MessageService } from './message/message.service';
import { existsSync, readFileSync } from 'fs';
import { VoiceService } from './voice/voice.service';

@Injectable()
export class DiscordClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordClientService.name);
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
    this.logger.log('Initializing Discord Bot...');
    this.client.once('ready', () => {
      this.logger.log(`...Logged in as ${this.client.user?.tag}`);
      this.loadConnectedChannels();
    });

    this.client.on('messageCreate', (message) => {
      this.messageService.handleMessage(message);
    });

    // subscribe to user connections events
    this.client.on(
      Events.VoiceStateUpdate,
      (oldState: VoiceState, newState: VoiceState) => {
        this.voiceService.handleVoiceStateUpdate(oldState, newState);
      },
    );

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  async onModuleDestroy() {
    this.logger.log('Destroying Discord Bot');
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
    for (const { guildId, channelId } of data) {
      const guild = await this.getGuildById(guildId);
      const channel = guild?.channels.resolve(channelId) as VoiceChannel;

      if (channel) {
        this.logger.log(
          `Reconnecting to channel ${channel.name} in guild ${guild.name}`,
        );
        this.voiceService.joinChannel(channel);
      }
    }
    return;
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
