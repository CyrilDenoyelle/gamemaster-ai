import { Module } from '@nestjs/common';
import { DiscordClientService } from './discord-client.service';
import { MessageModule } from './message/message.module';
import { VoiceService } from './voice/voice.service';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [MessageModule, VoiceModule],
  providers: [DiscordClientService, VoiceService],
})
export class DiscordModule {}
