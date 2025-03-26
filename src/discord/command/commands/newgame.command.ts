import { Command } from '../command.interface';
import { Interaction, SlashCommandBuilder } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class NewGame implements Command {
  private gameServiceFactory: GameServiceFactory;

  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  data = new SlashCommandBuilder()
    .setName('newgame')
    .setDescription('Starts a new game. (!newgame <userPrompt>)')
    .addStringOption((option) =>
      option
        .setName('user-prompt')
        .setDescription('The user prompt to start the game')
        .setRequired(false),
    );

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { channel } = interaction;
    interaction.reply(`Demande de nouvelle partie reçue !
Création en cours...`);

    const { gameName, message: firstMessage } =
      await this.gameServiceFactory.newGame(
        channel?.id,
        interaction.options.getString('gamename') || '',
      );

    interaction.channel
      .send(`Nouvelle partie: ${gameName} ! Votre aventure commence ici !

${firstMessage}`);
  }
}
