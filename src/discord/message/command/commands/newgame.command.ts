import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class NewGame implements Command {
  name = 'newgame';
  description = 'Starts a new game. (!newgame <userPrompt>)';

  private gameServiceFactory: GameServiceFactory;
  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  async execute(message: Message) {
    const { channel, content } = message;
    // Extract argument from the message content
    const args = content.split('!newgame ').slice(1); // Assuming the command is "!newgame <arg>"
    const userPrompt = args[0] || ''; // Use 'default' if no argument is provided

    const { gameName, message: firstMessage } =
      await this.gameServiceFactory.newGame(channel?.id, userPrompt);

    if (message.channel?.isTextBased() && 'send' in message.channel) {
      message.channel
        .send(`Nouvelle partie: ${gameName} ! Votre aventure commence ici !

${firstMessage}`);
    }
  }
}
