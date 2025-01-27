import { Test, TestingModule } from '@nestjs/testing';
import { VoiceInService } from './voice-in.service';

describe('VoiceInService', () => {
  let service: VoiceInService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoiceInService],
    }).compile();

    service = module.get<VoiceInService>(VoiceInService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
