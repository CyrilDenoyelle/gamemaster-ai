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
    .setDescription('Save the current game, optionally with a new name.')
    .addStringOption((option) =>
      option
        .setName('new-name')
        .setDescription('New name for the game.')
        .setRequired(false),
    );

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { channel } = interaction;
    let game = this.gameServiceFactory.getGame(channel?.id);
    if (!game) {
      interaction.reply(`Pas de partie en cours dans ce channel.
Utilisez \`/newgame\` pour démarrer une nouvelle partie.
Ou \`/showgames\` pour voir la liste des parties sauvegardées.
Puis \`/loadgame <gameName>\` pour charger une partie existante.`);
      return;
    }
    interaction.reply(`Sauvegarde de la partie "${game.gameName}" en cours...`);
    const newName = interaction.options.getString('new-name');
    if (newName) {
      this.gameServiceFactory.renameGame(channel?.id, newName);
    }
    this.gameServiceFactory.saveCurrentGame(channel?.id);
    game = this.gameServiceFactory.getGame(channel?.id);
    channel.send(`Partie "${game.gameName}" sauvegardé !
Nouveau nom du fichier: ${game.fileName}`);
  }
}
