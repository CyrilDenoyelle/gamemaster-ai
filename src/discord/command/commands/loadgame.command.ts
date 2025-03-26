import { Command } from '../command.interface';
import { Interaction, SlashCommandBuilder } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class LoadGame implements Command {
  private gameServiceFactory: GameServiceFactory;

  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  data = new SlashCommandBuilder()
    .setName('loadgame')
    .setDescription('Load a saved game by its name.')
    .addStringOption((option) =>
      option
        .setName('gamename')
        .setDescription(
          'The name of the game to load, by default the last saved game.',
        )
        .setRequired(false),
    );

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { channel } = interaction;

    const resp = await this.gameServiceFactory.loadGameFromStorage(
      channel?.id,
      interaction.options.getString('gamename') || '',
    );
    interaction.reply(resp.message);
  }
}
