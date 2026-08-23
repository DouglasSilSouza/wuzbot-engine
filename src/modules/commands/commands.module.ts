import { Module } from '@nestjs/common';
import { GlobalCommandService } from './global-command.service';

@Module({
  providers: [GlobalCommandService],
  exports: [GlobalCommandService],
})
export class CommandsModule {}
