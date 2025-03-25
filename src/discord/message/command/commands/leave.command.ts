import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { VoiceService } from '../../../voice/voice.service';

export default class JoinCommand implements Command {
  name = 'leave';
  description = 'Makes the bot leave the voice channel you are in.';

  private voiceService: VoiceService;
  constructor({ voiceService }: { voiceService: VoiceService }) {
    this.voiceService = voiceService;
  }

  execute(message: Message) {
    const { guild } = message;

    if (!guild) {
      message.reply('Cette commande ne peut être utilisée que sur un serveur.');
      return;
    }

    this.voiceService.leaveChannel(guild);
    message.reply(`A quitté le vocal sur le serveur : ${guild.name}`);
  }
}
