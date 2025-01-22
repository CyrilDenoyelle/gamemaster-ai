import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { AudioStreamModule } from 'src/audiostream/audiostream.module';

@Module({
  imports: [AudioStreamModule],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
