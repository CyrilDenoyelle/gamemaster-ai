import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  Partials,
  REST,
  Routes,
} from 'discord.js';
import { MessageService } from './message/message.service';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Command } from './command/command.interface';
import { CommandService } from './command/command.service';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

@Injectable()
export class DiscordClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordClientService.name);
  private client: Client;
  private readonly commandsPath = join(__dirname, 'command/commands'); // Directory for commands

  constructor(
    private readonly commandService: CommandService,
    private readonly messageService: MessageService,
    @Inject('GameServiceFactory')
    private readonly gameServiceFactory: GameServiceFactory,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.DirectMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing Discord Bot...');
    this.client.once('ready', () => {
      this.logger.log(`...Logged in as ${this.client.user?.tag}`);
      if (this.client.user?.id) {
        process.env.BOT_ID = this.client.user.id; // set bot id in env
      } else {
        this.logger.error('Failed to set BOT_ID: client user ID is undefined.');
      }
      this.registerSlashCommands();
    });

    this.client.on(Events.MessageCreate, (message) => {
      this.messageService.handleMessage(message);
    });

    // slahs commands
    this.client.on(Events.InteractionCreate, async (interaction: Interaction) =>
      this.commandService.handleCommand(interaction),
    );

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  async onModuleDestroy() {
    this.logger.log('Destroying Discord Bot');
    await this.client.destroy();
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

  public async registerSlashCommands() {
    const commandFiles = readdirSync(this.commandsPath).filter((file) =>
      file.endsWith('.command.js'),
    );
    const modules = await Promise.all(
      commandFiles.map(async (file) => {
        const module = await import(join(this.commandsPath, file));
        return { module, file };
      }),
    );

    const commands = modules.map(({ module, file }) => {
      const CommandClass = module.default;
      if (!CommandClass) {
        this.logger.log(`Invalid command file: ${file}`);
        return;
      }
      const command: Command = new CommandClass({
        gameServiceFactory: this.gameServiceFactory,
      });

      if (command && command.data && typeof command.execute === 'function') {
        return command;
      } else {
        this.logger.warn(`Invalid command definition in file: ${file}`);
        return;
      }
    });

    await this.commandService.registerCommands(commands);

    const rest = new REST({ version: '10' }).setToken(
      process.env.DISCORD_BOT_TOKEN,
    );

    try {
      for await (const element of this.client.guilds.cache) {
        const guildId = element[0];
        await rest.put(
          Routes.applicationGuildCommands(process.env.BOT_ID, guildId),
          {
            body: [],
          },
        );
      }

      await rest.put(Routes.applicationCommands(this.client.user.id), {
        body: commands.map((command) => command.data.toJSON()),
      });
      this.logger.log('Slash commands registered successfully!');
    } catch (error) {
      this.logger.error('Error registering slash commands:', error);
    }
  }
}
