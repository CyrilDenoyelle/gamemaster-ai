import { Command } from '../command.interface';
import { Message } from 'discord.js';
import { VoiceService } from '../../../voice/voice.service';

export default class JoinCommand implements Command {
  name = 'joinme';
  description = 'Makes the bot join the voice channel you are in.';

  constructor(private readonly voiceService: VoiceService) {}

  execute(message: Message) {
    const { member, guild } = message;

    if (!guild) {
      message.reply('This command can only be used in a server.');
      return;
    }

    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      message.reply('You need to join a voice channel first!');
      return;
    }

    this.voiceService.joinChannel(voiceChannel);
    message.reply(`Joined the voice channel: ${voiceChannel.name}`);
  }
}
