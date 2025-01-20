import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandService } from '../command/command.service';
import { Command } from './command.interface';
import { readdirSync } from 'fs';
import { join } from 'path';
import { VoiceService } from '../../voice/voice.service';

@Injectable()
export class CommandLoader implements OnModuleInit {
  private readonly commandsPath = join(__dirname, 'commands'); // Directory for commands

  constructor(
    private readonly commandService: CommandService,
    private readonly voiceService: VoiceService,
  ) {}

  async onModuleInit() {
    await this.loadCommands();
  }

  private async loadCommands() {
    console.log('Loading commands:');
    const commandFiles = readdirSync(this.commandsPath).filter((file) =>
      file.endsWith('.command.js'),
    );
    for (const file of commandFiles) {
      const module = await import(join(this.commandsPath, file));
      const CommandClass = module.default;
      if (!CommandClass) {
        console.warn(`Invalid command file: ${file}`);
        continue;
      }

      const command: Command = new CommandClass(this.voiceService);

      if (command && command.name && typeof command.execute === 'function') {
        this.commandService.registerCommand(
          command.name,
          command.execute.bind(command),
        );
        console.log(`- ${command.name}`);
      } else {
        console.warn(`Invalid command definition in file: ${file}`);
      }
    }
    console.log('...Commands loaded');
  }
}
