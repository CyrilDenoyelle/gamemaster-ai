import { forwardRef, Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { AudioStreamModule } from '../../audiostream/audiostream.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [forwardRef(() => AudioStreamModule), GameModule],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
