import { Command } from '../command.interface';
import { Interaction, SlashCommandBuilder } from 'discord.js';
import { VoiceService } from '../../voice/voice.service';

export default class JoinCommand implements Command {
  private voiceService: VoiceService;

  constructor({ voiceService }: { voiceService: VoiceService }) {
    this.voiceService = voiceService;
  }

  data = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Makes the bot leave the voice channel you are in.');

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { guild } = interaction;

    if (!guild) {
      interaction.reply(
        'Cette commande ne peut être utilisée que sur un serveur.',
      );
      return;
    }

    this.voiceService.leaveChannel(guild);
    interaction.reply(`A quitté le vocal sur le serveur : ${guild.name}`);
  }
}
