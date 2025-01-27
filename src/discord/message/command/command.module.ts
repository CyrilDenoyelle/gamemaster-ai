import { Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandLoader } from './command-loader.service';
import { VoiceInModule } from '../../voice-in/voice-in.module';

@Module({
  imports: [VoiceInModule],
  providers: [CommandService, CommandLoader],
  exports: [CommandService],
})
export class CommandModule {}
