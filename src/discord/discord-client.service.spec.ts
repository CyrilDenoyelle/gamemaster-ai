import { Test, TestingModule } from '@nestjs/testing';
import { DiscordClientService } from './discord-client.service';
import { MessageModule } from './message/message.module';
import { VoiceModule } from './voice/voice.module';

describe('DiscordClientService', () => {
  let service: DiscordClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MessageModule, VoiceModule],
      providers: [DiscordClientService],
    }).compile();

    service = module.get<DiscordClientService>(DiscordClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
