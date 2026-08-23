import { Module } from '@nestjs/common';
import { WuzMindMediaRoutingService } from './wuzmind-media-routing.service';
import { WuzMindModule } from '../wuzmind/wuzmind.module';

@Module({
  imports: [WuzMindModule],
  providers: [WuzMindMediaRoutingService],
  exports: [WuzMindMediaRoutingService],
})
export class MediaRoutingModule {}
