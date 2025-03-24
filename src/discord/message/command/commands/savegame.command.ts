import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class SaveGame implements Command {
  name = 'savegame';
  description =
    'Save current game with given name if provided. (!savegame <newName>)';

  private gameServiceFactory: GameServiceFactory;
  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  execute(message: Message) {
    const { channel, content } = message;
    // Extract argument from the message content
    const args = content.split('!savegame ').slice(1); // Assuming the command is "!savegame <arg>"
    const newName = args[0] || ''; // Use 'default' if no argument is provided

    const fileName = newName.replace(/[^a-zA-Z0-9-_]/g, '_'); // Replace invalid characters with '_'
    const game = this.gameServiceFactory.renameGame(channel?.id, fileName);
    const { gameName } = game.getGame();
    message.reply(`Game renamed and saved as: ${gameName} !`);
  }
}
