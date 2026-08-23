import { Module } from '@nestjs/common';
import { HumanBehaviorService } from './human-behavior.service';
import { WuzMindModule } from '../wuzmind/wuzmind.module';

@Module({
  imports: [WuzMindModule],
  providers: [HumanBehaviorService],
  exports: [HumanBehaviorService],
})
export class HumanBehaviorModule {}
