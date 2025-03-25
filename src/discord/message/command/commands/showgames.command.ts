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
    const { channel, content } = message;

    // Extract argument from the message content
    const args = content.split(`${this.name} `).slice(1); // Assuming the command is "!commandName <arg>"
    const search = args[0] || ''; // Use 'default' if no argument is provided

    const games = this.gameServiceFactory.getGames(channel?.id, search);
    message.reply(`Liste des parties sauvegardées :
${games.map((g) => `- ${g}`).join('\n')}

Pour charger une partie \`!loadgame <gameName>\``);
  }
}
