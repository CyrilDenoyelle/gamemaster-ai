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

  execute(message: Message) {
    const { member, guild, content } = message;

    if (!guild) {
      message.reply('This command can only be used in a server.');
      return;
    }

    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      message.reply('You need to join a voice channel first!');
      return;
    }

    // Extract argument from the message content
    const args = content.split('!newgame ').slice(1); // Assuming the command is "!newgame <arg>"
    const userPrompt = args[0] || ''; // Use 'default' if no argument is provided

    const game = this.gameServiceFactory.newGame(userPrompt);
    const { gameName } = game.getGame();
    message.reply(`New game started: ${gameName} !`);
  }
}
