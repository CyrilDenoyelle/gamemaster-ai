import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';

type CommandHandler = (message: Message, args: string[]) => void;

@Injectable()
export class CommandService {
  private readonly commands = new Map<string, CommandHandler>();

  registerCommand(command: string, handler: CommandHandler) {
    if (this.commands.has(command)) {
      throw new Error(`Command "${command}" is already registered.`);
    }
    this.commands.set(command, handler);
  }

  handleCommand(message: Message) {
    const [command, ...args] = message.content.slice(1).trim().split(/\s+/);
    const handler = this.commands.get(command);

    if (handler) {
      handler(message, args);
    } else {
      message.reply(`Unknown command: ${command}`);
    }
  }
}
