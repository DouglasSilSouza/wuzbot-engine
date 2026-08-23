import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WuzMindConfig {
  readonly enabled: boolean;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly minConfidence: number;
  readonly softTimeoutMinutes: number;
  readonly hardTimeoutHours: number;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('WUZMIND_ENABLED', 'true') !== 'false';
    this.baseUrl = (
      this.config.get<string>('WUZMIND_URL') ?? 'http://wuzmind-service:3000'
    ).replace(/\/+$/, '');
    this.apiKey = this.config.get<string>('WUZMIND_API_KEY', '');
    this.timeoutMs = Number(this.config.get<string>('WUZMIND_TIMEOUT_MS', '10000')) || 10000;
    this.minConfidence =
      Number(this.config.get<string>('WUZMIND_MIN_CONFIDENCE', '0.65')) || 0.65;
    this.softTimeoutMinutes =
      Number(this.config.get<string>('SESSION_SOFT_TIMEOUT_MINUTES', '10')) || 10;
    this.hardTimeoutHours =
      Number(this.config.get<string>('SESSION_HARD_TIMEOUT_HOURS', '12')) || 12;
  }
}
