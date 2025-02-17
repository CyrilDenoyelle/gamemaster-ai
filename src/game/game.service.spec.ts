import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { OpenAiService } from '../chat/open-ai/open-ai.service';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService, OpenAiService],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
