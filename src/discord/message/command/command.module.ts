import { Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandLoader } from './command-loader.service';
import { VoiceModule } from '../../voice/voice.module';

@Module({
  imports: [VoiceModule],
  providers: [CommandService, CommandLoader],
  exports: [CommandService],
})
export class CommandModule {}
