import { Command } from '../command.interface';
import { Interaction, SlashCommandBuilder } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class ShowGames implements Command {
  private gameServiceFactory: GameServiceFactory;

  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  data = new SlashCommandBuilder()
    .setName('showgames')
    .setDescription('Show a list of all saved games in this channel.')
    .addStringOption((option) =>
      option
        .setName('search')
        .setDescription('Search for a specific game by name')
        .setRequired(false),
    );

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { channel } = interaction;

    // Extract argument from the message content
    const search = interaction.options.getString('search');
    const games = this.gameServiceFactory.getGames(channel?.id, search);
    interaction.reply(`Liste des parties sauvegardées :
${games.map((fileName) => `- ${fileName}`).join('\n')}

Pour charger une partie \`/loadgame <gameName>\``);
  }
}
