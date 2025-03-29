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
    .setDescription('Starts a new game.')
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
        interaction.options.getString('user-prompt') || '',
      );

    // split into chunks of 2000 characters
    const messages =
      `Nouvelle partie: ${gameName} ! Votre aventure commence ici !

    ${firstMessage}`.match(/[\s\S]{1,2000}/g);

    for await (const message of messages) {
      await interaction.channel?.send(message);
    }
  }
}
