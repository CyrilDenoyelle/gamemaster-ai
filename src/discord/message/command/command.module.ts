import { forwardRef, Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandLoader } from './command-loader.service';
import { VoiceModule } from '../../voice/voice.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [VoiceModule, forwardRef(() => ChatModule)],
  providers: [CommandService, CommandLoader],
  exports: [CommandService],
})
export class CommandModule {}
