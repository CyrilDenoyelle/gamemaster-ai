import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamModule } from 'src/audiostream/audiostream.module';
import { GameService } from './game.service';
import { OpenAiService } from '../chat/open-ai/open-ai.service';
import { PromptCompilerModule } from 'src/prompt-compiler/prompt-compiler.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [
    forwardRef(() => AudioStreamModule),
    forwardRef(() => PromptCompilerModule),
    ChatModule,
  ],
  providers: [GameService, OpenAiService],
  exports: [GameService, OpenAiService],
})
export class GameModule {}
