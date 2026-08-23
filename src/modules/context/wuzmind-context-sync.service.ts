import { Injectable, Logger } from '@nestjs/common';
import { WuzMindService } from '../wuzmind/wuzmind.service';
import { ContextManagerService } from './context-manager.service';
import { WuzbotContextEntity } from './context.entity';

@Injectable()
export class WuzMindContextSyncService {
  private readonly logger = new Logger(WuzMindContextSyncService.name);

  constructor(
    private readonly localContext: ContextManagerService,
    private readonly wuzmind: WuzMindService,
  ) {}

  /**
   * Syncs local DB context state to remote WuzMind cognitive memory asynchronously.
   */
  async syncToRemote(phone: string): Promise<void> {
    try {
      const local = await this.localContext.getByPhone(phone);
      if (!local) return;

      await this.wuzmind.syncContext(phone, {
        phone: local.phone,
        currentState: local.currentState,
        lastIntent: local.lastIntent,
        lastTypebotGroup: local.lastTypebotGroup,
        waitingFor: local.waitingFor,
        lastBank: local.lastBank,
        lastMonth: local.lastMonth,
        sessionStatus: local.sessionStatus,
        contextData: local.contextData,
      });
    } catch (err) {
      this.logger.warn(`[WUZMIND_CONTEXT_SYNC] Background sync failed for ${phone}: ${err}`);
    }
  }

  /**
   * Clears context locally and remotely when user exits or resets.
   */
  async clearBoth(phone: string): Promise<void> {
    await this.localContext.resetContext(phone);
    await this.wuzmind.clearRemoteContext(phone);
  }
}
