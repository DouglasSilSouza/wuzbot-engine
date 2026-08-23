import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WuzbotContextEntity } from './context.entity';
import { ContextManagerService } from './context-manager.service';
import { WuzMindContextSyncService } from './wuzmind-context-sync.service';
import { WuzMindModule } from '../wuzmind/wuzmind.module';

@Module({
  imports: [TypeOrmModule.forFeature([WuzbotContextEntity]), WuzMindModule],
  providers: [ContextManagerService, WuzMindContextSyncService],
  exports: [ContextManagerService, WuzMindContextSyncService, TypeOrmModule],
})
export class ContextModule {}
