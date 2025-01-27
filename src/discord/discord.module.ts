import { Module } from '@nestjs/common';
import { DiscordClientService } from './discord-client.service';
import { MessageModule } from './message/message.module';
import { VoiceInModule } from './voice-in/voice-in.module';

@Module({
  imports: [MessageModule, VoiceInModule],
  providers: [DiscordClientService],
})
export class DiscordModule {}
