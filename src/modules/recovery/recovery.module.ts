import { Module } from '@nestjs/common';
import { RecoveryModeService } from './recovery.service';
import { WuzMindModule } from '../wuzmind/wuzmind.module';

@Module({
  imports: [WuzMindModule],
  providers: [RecoveryModeService],
  exports: [RecoveryModeService],
})
export class RecoveryModule {}
