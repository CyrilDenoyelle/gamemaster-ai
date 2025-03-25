import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class PauseGame implements Command {
  name = 'pausegame';
  description = 'Met la partie en pause. (!pausegame <nouveauNom>)';

  private gameServiceFactory: GameServiceFactory;
  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  execute(message: Message) {
    const { channel } = message;

    this.gameServiceFactory.pauseGame(channel?.id);
    message.reply(
      `Game paused, use \`!loadgame <gameName>\` to resume the game.`,
    );
  }
}
