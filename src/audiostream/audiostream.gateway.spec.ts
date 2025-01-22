import { Test, TestingModule } from '@nestjs/testing';
import { AudioStreamGateway } from './audiostream.gateway';

describe('AudioStreamGateway', () => {
  let gateway: AudioStreamGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioStreamGateway],
    }).compile();

    gateway = module.get<AudioStreamGateway>(AudioStreamGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
