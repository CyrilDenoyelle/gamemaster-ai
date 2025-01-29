import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamModule } from 'src/audiostream/audiostream.module';
import { ChatService } from './chat.service';
import { OpenAiService } from './open-ai/open-ai.service';

@Module({
  imports: [forwardRef(() => AudioStreamModule)],
  providers: [ChatService, OpenAiService],
  exports: [ChatService],
})
export class ChatModule {}
