import { Inject, Injectable } from '@nestjs/common';
import { WUZMIND_CLIENT, WuzMindClient } from './interfaces/wuzmind-client.interface';

@Injectable()
export class WuzMindHealthService {
  constructor(
    @Inject(WUZMIND_CLIENT) private readonly client: WuzMindClient,
  ) {}

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.client.health();
      return res.status === 'ok';
    } catch {
      return false;
    }
  }
}
