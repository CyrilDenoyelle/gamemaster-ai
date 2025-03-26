import { Command } from '../command.interface';
import { GuildMember, Interaction, SlashCommandBuilder } from 'discord.js';
import { VoiceService } from '../../voice/voice.service';

export default class JoinCommand implements Command {
  private voiceService: VoiceService;

  constructor({ voiceService }: { voiceService: VoiceService }) {
    this.voiceService = voiceService;
  }

  data = new SlashCommandBuilder()
    .setName('joinme')
    .setDescription('Makes the bot join the voice channel you are in.');

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { member, guild } = interaction;

    if (!guild) {
      interaction.reply(
        'Cette commande ne peut être utilisée que sur un serveur..',
      );
      return;
    }

    const voiceChannel =
      member instanceof GuildMember ? member.voice.channel : null;
    if (!voiceChannel) {
      interaction.reply('You need to join a voice channel first!');
      return;
    }

    this.voiceService.joinChannel(voiceChannel);
    interaction.reply(`Me voila !`);
  }
}
