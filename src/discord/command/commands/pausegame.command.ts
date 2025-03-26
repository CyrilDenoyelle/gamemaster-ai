import { Command } from '../command.interface';
import { Interaction, SlashCommandBuilder } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class PauseGame implements Command {
  private gameServiceFactory: GameServiceFactory;

  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  data = new SlashCommandBuilder()
    .setName('pausegame')
    .setDescription('Pause the current game.');

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { channel } = interaction;

    this.gameServiceFactory.pauseGame(channel?.id);
    interaction.reply(
      `Partie mise en pause, utilisez \`/loadgame <gameName>\` pour reprendre la partie.`,
    );
  }
}
