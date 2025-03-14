import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import { CommandService } from './command/command.service';

@Injectable()
export class MessageService {
  constructor(private readonly commandService: CommandService) {}

  handleMessage(message: Message) {
    if (!message.author.bot && message.content.startsWith('!')) {
      this.commandService.handleCommand(message);
    }
  }
}
