import { Inject, Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import { CommandService } from './command/command.service';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

@Injectable()
export class MessageService {
  hooks: ((message: Message) => void)[] = [];

  constructor(
    private readonly commandService: CommandService,
    @Inject('GameServiceFactory')
    private readonly gameServiceFactory: GameServiceFactory,
  ) {}

  async handleMessage(message: Message) {
    if (!message.author.bot) {
      if (message.content.startsWith('!')) {
        this.commandService.handleCommand(message);
      } else {
        const answer =
          await this.gameServiceFactory.sendDiscordMessage(message);
        if (message.channel?.isTextBased() && 'send' in message.channel) {
          message.channel.send(answer);
        }
      }
    }
  }
}
