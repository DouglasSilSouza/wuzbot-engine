import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();
  constructor(private readonly dataSource: DataSource) {}
  @Get()
  async check(): Promise<Record<string, unknown>> { let database = 'down'; try { await this.dataSource.query('SELECT 1'); database = 'up'; } catch { database = 'down'; } return { status: database === 'up' ? 'ok' : 'degraded', uptime: Math.floor((Date.now() - this.startedAt) / 1000), provider: 'typebot', database }; }
}
