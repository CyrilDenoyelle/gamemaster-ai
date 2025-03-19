import { forwardRef, Module } from '@nestjs/common';
import { AudioStreamModule } from 'src/audiostream/audiostream.module';
import { OpenAiService } from '../chat/open-ai/open-ai.service';
import { PromptCompilerModule } from 'src/prompt-compiler/prompt-compiler.module';
import { ChatModule } from 'src/chat/chat.module';
import { GameGateway } from './game.gateway';
import { GameServiceFactory } from './gameServiceFactory';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';

@Module({
  imports: [
    forwardRef(() => AudioStreamModule),
    forwardRef(() => PromptCompilerModule),
    forwardRef(() => ChatModule),
  ],
  providers: [
    GameGateway,
    OpenAiService,
    {
      provide: 'GameServiceFactory',
      useFactory: (audioStreamGateway, chatServiceFactory, gameGateway) =>
        new GameServiceFactory(
          audioStreamGateway,
          chatServiceFactory,
          gameGateway,
        ),
      inject: [AudioStreamGateway, 'ChatServiceFactory', GameGateway],
    },
  ],
  exports: [OpenAiService, 'GameServiceFactory'],
})
export class GameModule {}
