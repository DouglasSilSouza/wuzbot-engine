import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WuzMindConfig } from './wuzmind.config';
import { WuzMindRestClient } from './wuzmind.client';
import { WUZMIND_CLIENT } from './interfaces/wuzmind-client.interface';
import { WuzMindService } from './wuzmind.service';
import { WuzMindHealthService } from './wuzmind.health.service';

@Module({
  imports: [ConfigModule],
  providers: [
    WuzMindConfig,
    WuzMindRestClient,
    {
      provide: WUZMIND_CLIENT,
      useExisting: WuzMindRestClient,
    },
    WuzMindService,
    WuzMindHealthService,
  ],
  exports: [WuzMindService, WuzMindHealthService, WuzMindConfig, WUZMIND_CLIENT],
})
export class WuzMindModule {}
