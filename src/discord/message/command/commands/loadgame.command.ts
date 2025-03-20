import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { Game } from 'src/game/game.service';
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

  execute(message: Message) {
    const { guild, content } = message;

    if (!guild) {
      message.reply('This command can only be used in a server.');
      return;
    }

    // Extract argument from the message content
    const args = content.split(`${this.name} `).slice(1); // Assuming the command is "!commandName <arg>"
    const gamename = args[0] || '';

    const game: Game = this.gameServiceFactory.getGameFile(gamename);
    this.gameServiceFactory.loadGame(game);
    message.reply(`game loaded: ${gamename} !`);
  }
}
