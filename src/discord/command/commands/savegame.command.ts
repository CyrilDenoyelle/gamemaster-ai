import { Command } from '../command.interface';
import { Interaction, SlashCommandBuilder } from 'discord.js';
import { GameServiceFactory } from 'src/game/gameServiceFactory';

export default class SaveGame implements Command {
  private gameServiceFactory: GameServiceFactory;

  constructor({
    gameServiceFactory,
  }: {
    gameServiceFactory: GameServiceFactory;
  }) {
    this.gameServiceFactory = gameServiceFactory;
  }

  data = new SlashCommandBuilder()
    .setName('savegame')
    .setDescription(
      'Save current game with given name if provided. (!savegame <newName>)',
    );

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { channel } = interaction;
    const game = this.gameServiceFactory.getGame(channel?.id);
    if (!game) {
      interaction.reply(`Pas de partie en cours dans ce channel.
Utilisez \`/newgame\` pour démarrer une nouvelle partie.
Ou \`/showgames\` pour voir la liste des parties sauvegardées.
Puis \`/loadgame <gameName>\` pour charger une partie existante.`);
      return;
    }
    this.gameServiceFactory.saveCurrentGame(channel?.id);
    interaction.reply(`Partie "${game.gameName}" sauvegardé !`);
  }
}
