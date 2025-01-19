import { Command } from '../command.interface';
import { Message } from 'discord.js';

export default class HelloCommand implements Command {
  name = 'hello';
  description = 'Replies with a friendly greeting.';

  execute(message: Message, args: string[]) {
    console.log('HelloCommand.execute', message.author.username);
    message.reply(`Hello ${message.author.username}!`);
  }
}
