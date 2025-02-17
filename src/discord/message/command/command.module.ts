import { forwardRef, Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandLoader } from './command-loader.service';
import { VoiceModule } from '../../voice/voice.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [VoiceModule, forwardRef(() => GameModule)],
  providers: [CommandService, CommandLoader],
  exports: [CommandService],
})
export class CommandModule {}
