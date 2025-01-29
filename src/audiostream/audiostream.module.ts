import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamGateway } from './audiostream.gateway';
import { VoiceModule } from 'src/discord/voice/voice.module';

@Module({
  imports: [forwardRef(() => VoiceModule)],
  providers: [AudioStreamGateway],
  exports: [AudioStreamGateway],
})
export class AudioStreamModule {}
