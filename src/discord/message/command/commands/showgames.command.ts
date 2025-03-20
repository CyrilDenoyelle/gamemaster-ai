import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class ShowGames implements Command {
  name = 'showgames';
  description = 'Show a list of all saved games.';

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
    const search = args[0] || ''; // Use 'default' if no argument is provided

    const games = this.gameServiceFactory
      .getGames()
      .filter((game) => (search ? game.includes(search) : true));
    message.reply(`games list:
${games.map((g) => `- ${g}`).join('\n')}

To load a game, use the command \`!loadgame <gameName>\``);
  }
}
