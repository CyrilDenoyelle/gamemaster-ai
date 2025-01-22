import { Module } from '@nestjs/common';
import { AudioStreamGateway } from './audiostream.gateway';

@Module({
  providers: [AudioStreamGateway],
  exports: [AudioStreamGateway],
})
export class AudioStreamModule {}
