import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class LoadGame implements Command {
  name = 'loadgame';
  description = 'Load a saved game by its name. (!loadgame <gameName>)';

  private gameServiceFactory: GameServiceFactory;
  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  async execute(message: Message) {
    const { content, channel } = message;

    // Extract argument from the message content
    const args = content.split(`${this.name} `).slice(1); // Assuming the command is "!commandName <arg>"
    const gamename = args[0] || '';

    const resp = await this.gameServiceFactory.loadGameFromStorage(
      channel?.id,
      gamename,
    );
    if (message.channel?.isTextBased() && 'send' in message.channel) {
      message.channel.send(resp.message);
    }
  }
}
