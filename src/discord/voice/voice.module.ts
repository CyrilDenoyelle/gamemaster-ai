import { forwardRef, Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { AudioStreamModule } from '../../audiostream/audiostream.module';

@Module({
  imports: [forwardRef(() => AudioStreamModule)],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
