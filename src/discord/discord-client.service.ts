import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, GatewayIntentBits } from 'discord.js';

@Injectable()
export class DiscordClientService implements OnModuleInit, OnModuleDestroy {
  private client: Client;

  constructor() {
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
    });

    this.client.on('messageCreate', (message) => {
      if (message.content === '!ping') {
        message.reply('Pong!');
      }
    });

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  async onModuleDestroy() {
    console.log('Destroying Discord Bot...');
    await this.client.destroy();
  }
}
