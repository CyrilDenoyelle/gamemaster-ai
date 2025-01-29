import { Test, TestingModule } from '@nestjs/testing';
import { OpenAiService } from './open-ai.service';
import { ChatService } from '../chat.service';

describe('OpenAiService', () => {
  let service: OpenAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenAiService, ChatService],
    }).compile();

    service = module.get<OpenAiService>(OpenAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
