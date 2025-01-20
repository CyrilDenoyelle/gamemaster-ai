import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandService } from '../command/command.service';
import { Command } from './command.interface';
import { readdirSync } from 'fs';
import { join } from 'path';
import { VoiceService } from '../../voice/voice.service';

@Injectable()
export class CommandLoader implements OnModuleInit {
  private readonly logger = new Logger(CommandLoader.name);
  private readonly commandsPath = join(__dirname, 'commands'); // Directory for commands

  constructor(
    private readonly commandService: CommandService,
    private readonly voiceService: VoiceService,
  ) {}

  async onModuleInit() {
    await this.loadCommands();
  }

  private async loadCommands() {
    this.logger.log('Loading commands...');
    const commandFiles = readdirSync(this.commandsPath).filter((file) =>
      file.endsWith('.command.js'),
    );
    for (const file of commandFiles) {
      const module = await import(join(this.commandsPath, file));
      const CommandClass = module.default;
      if (!CommandClass) {
        this.logger.log(`Invalid command file: ${file}`);
        continue;
      }

      const command: Command = new CommandClass(this.voiceService);

      if (command && command.name && typeof command.execute === 'function') {
        this.commandService.registerCommand(
          command.name,
          command.execute.bind(command),
        );
        this.logger.log(`${command.name}`);
      } else {
        this.logger.warn(`Invalid command definition in file: ${file}`);
      }
    }
    this.logger.log('...Commands loaded');
  }
}
