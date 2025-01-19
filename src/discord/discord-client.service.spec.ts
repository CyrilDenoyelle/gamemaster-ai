import { Test, TestingModule } from '@nestjs/testing';
import { DiscordClientService } from './discord-client.service';
import { MessageModule } from './message/message.module';

describe('DiscordClientService', () => {
  let service: DiscordClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordClientService],
      imports: [MessageModule],
    }).compile();

    service = module.get<DiscordClientService>(DiscordClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
