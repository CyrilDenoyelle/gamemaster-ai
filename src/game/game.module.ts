import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamModule } from 'src/audiostream/audiostream.module';
import { GameService } from './game.service';
import { OpenAiService } from '../chat/open-ai/open-ai.service';
import { PromptCompilerModule } from 'src/prompt-compiler/prompt-compiler.module';
import { ChatModule } from 'src/chat/chat.module';
import { GameGateway } from './game.gateway';

@Module({
  imports: [
    forwardRef(() => AudioStreamModule),
    forwardRef(() => PromptCompilerModule),
    ChatModule,
  ],
  providers: [GameService, GameGateway, OpenAiService],
  exports: [GameService, OpenAiService],
})
export class GameModule {}
