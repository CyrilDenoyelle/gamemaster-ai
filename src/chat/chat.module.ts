import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamModule } from 'src/audiostream/audiostream.module';
import { ChatService } from './chat.service';
import { OpenAiService } from './open-ai/open-ai.service';
import { PromptCompilerModule } from 'src/prompt-compiler/prompt-compiler.module';

@Module({
  imports: [
    forwardRef(() => AudioStreamModule),
    forwardRef(() => PromptCompilerModule),
  ],
  providers: [ChatService, OpenAiService],
  exports: [ChatService, OpenAiService],
})
export class ChatModule {}
