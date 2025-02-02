import { Test, TestingModule } from '@nestjs/testing';
import { PromptCompilerService } from './prompt-compiler.service';

describe('PromptCompilerService', () => {
  let service: PromptCompilerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptCompilerService],
    }).compile();

    service = module.get<PromptCompilerService>(PromptCompilerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
