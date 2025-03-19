import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class NewGame implements Command {
  name = 'newgame';
  description = 'Starts a new game.';

  private gameServiceFactory: GameServiceFactory;
  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  execute(message: Message) {
    const { member, guild } = message;

    if (!guild) {
      message.reply('This command can only be used in a server.');
      return;
    }

    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      message.reply('You need to join a voice channel first!');
      return;
    }

    const game = this.gameServiceFactory.newGame();
    const { gameName } = game.getGame();
    message.reply(`New game started: ${gameName} !`);
  }
}
