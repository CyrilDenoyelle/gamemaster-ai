import { Module } from '@nestjs/common';
import { VoiceInService } from './voice-in.service';
import { AudioStreamModule } from 'src/audiostream/audiostream.module';

@Module({
  imports: [AudioStreamModule],
  providers: [VoiceInService],
  exports: [VoiceInService],
})
export class VoiceInModule {}
