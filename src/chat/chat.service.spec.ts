import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { OpenAiService } from './open-ai/open-ai.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, OpenAiService],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
