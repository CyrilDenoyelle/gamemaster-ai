import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamGateway } from './audiostream.gateway';
import { VoiceModule } from 'src/discord/voice/voice.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [forwardRef(() => VoiceModule), forwardRef(() => GameModule)],
  providers: [AudioStreamGateway],
  exports: [AudioStreamGateway],
})
export class AudioStreamModule {}
