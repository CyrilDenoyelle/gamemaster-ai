import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamGateway } from './audiostream.gateway';
import { VoiceModule } from 'src/discord/voice/voice.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [forwardRef(() => VoiceModule), forwardRef(() => ChatModule)],
  providers: [AudioStreamGateway],
  exports: [AudioStreamGateway],
})
export class AudioStreamModule {}
