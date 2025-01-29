import { Module } from '@nestjs/common';
import { DiscordClientService } from './discord-client.service';
import { MessageModule } from './message/message.module';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [MessageModule, VoiceModule],
  providers: [DiscordClientService],
})
export class DiscordModule {}
