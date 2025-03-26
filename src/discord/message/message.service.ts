import { Inject, Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

@Injectable()
export class MessageService {
  hooks: ((message: Message) => void)[] = [];

  constructor(
    @Inject('GameServiceFactory')
    private readonly gameServiceFactory: GameServiceFactory,
  ) {}

  async handleMessage(message: Message) {
    if (!message.author.bot) {
      const answer = await this.gameServiceFactory.sendDiscordMessage(message);
      if (
        message.channel?.isTextBased() &&
        'send' in message.channel &&
        answer
      ) {
        const messageChunks = answer.match(/[\s\S]{1,2000}/g);

        for await (const messageChunk of messageChunks) {
          await message.channel.send(messageChunk);
        }
      }
    }
  }
}
