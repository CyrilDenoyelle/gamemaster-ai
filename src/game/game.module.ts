import { forwardRef, Module } from '@nestjs/common';
import { OpenAiService } from '../chat/open-ai/open-ai.service';
import { PromptCompilerModule } from 'src/prompt-compiler/prompt-compiler.module';
import { ChatModule } from 'src/chat/chat.module';
import { GameServiceFactory } from './gameServiceFactory';

@Module({
  imports: [
    forwardRef(() => PromptCompilerModule),
    forwardRef(() => ChatModule),
  ],
  providers: [
    OpenAiService,
    {
      provide: 'GameServiceFactory',
      useFactory: (chatServiceFactory) =>
        new GameServiceFactory(chatServiceFactory),
      inject: ['ChatServiceFactory'],
    },
  ],
  exports: [OpenAiService, 'GameServiceFactory'],
})
export class GameModule {}
