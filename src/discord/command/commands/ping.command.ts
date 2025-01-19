import { Command } from '../command.interface';
import { Message } from 'discord.js';

export default class PingCommand implements Command {
  name = 'ping';
  description = 'Replies with Pong!';

  execute(message: Message, args: string[]) {
    message.reply('Pong!');
  }
}
