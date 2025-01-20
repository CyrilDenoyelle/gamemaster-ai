import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { VoiceService } from '../../../voice/voice.service';

export default class JoinCommand implements Command {
  name = 'leave';
  description = 'Makes the bot leave the voice channel you are in.';

  constructor(private readonly voiceService: VoiceService) {}

  execute(message: Message) {
    const { guild } = message;

    if (!guild) {
      message.reply('This command can only be used in a server.');
      return;
    }

    this.voiceService.leaveChannel(guild);
    message.reply(`Leaved the voice channel in server: ${guild.name}`);
  }
}
