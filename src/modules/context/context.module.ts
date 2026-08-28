import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WuzbotContextEntity } from './context.entity';
import { ContextManagerService } from './context-manager.service';

@Module({
  imports: [TypeOrmModule.forFeature([WuzbotContextEntity])],
  providers: [ContextManagerService],
  exports: [ContextManagerService, TypeOrmModule],
})
export class ContextModule {}
