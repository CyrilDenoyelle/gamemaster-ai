import { forwardRef, Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { AudioStreamModule } from '../../audiostream/audiostream.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [forwardRef(() => AudioStreamModule), ChatModule],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
