import { Injectable, Logger } from '@nestjs/common';
import { WuzMindConfig } from './wuzmind.config';
import { WuzMindClient } from './interfaces/wuzmind-client.interface';
import {
  DetectHumanBehaviorDto,
  HumanBehaviorResponseDto,
  IntentClassifyRequestDto,
  IntentClassifyResponseDto,
  MediaClassifyRequestDto,
  MediaClassifyResponseDto,
  RecoveryRequestDto,
  RecoveryResponseDto,
  WuzMindContextDto,
} from './dto/wuzmind.dto';
import { IntentEnum } from './enums/intent.enum';
import { SuggestedActionEnum } from './enums/suggested-action.enum';
import { MediaClassificationEnum } from './enums/media-classification.enum';

@Injectable()
export class WuzMindRestClient implements WuzMindClient {
  private readonly logger = new Logger(WuzMindRestClient.name);
  private isCircuitOpen = false;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 3;
  private readonly circuitResetTimeMs = 10000;

  constructor(private readonly config: WuzMindConfig) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['x-wuzmind-api-key'] = this.config.apiKey;
      headers['x-api-key'] = this.config.apiKey;
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else {
      this.logger.warn(
        '[WUZMIND_AUTH_WARNING] WUZMIND_API_KEY is not defined in environment. Calls to WuzMind will likely fail with HTTP 401 Unauthorized.',
      );
    }
    return headers;
  }

  private checkCircuit(): boolean {
    if (!this.config.enabled) return false;
    if (this.isCircuitOpen) {
      if (Date.now() - this.lastFailureTime > this.circuitResetTimeMs) {
        this.logger.log('[WUZMIND_CIRCUIT] Half-open probe: attempting next request to WuzMind');
        this.isCircuitOpen = false;
        return true;
      }
      return false;
    }
    return true;
  }

  private recordSuccess(): void {
    if (this.consecutiveFailures > 0 || this.isCircuitOpen) {
      this.logger.log('[WUZMIND_CIRCUIT] Connection healthy. Resetting failure counter.');
    }
    this.consecutiveFailures = 0;
    this.isCircuitOpen = false;
  }

  private recordFailure(error: unknown, endpoint: string): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.logger.warn(
      `[WUZMIND_FAILURE] Failure ${this.consecutiveFailures}/${this.failureThreshold} calling ${endpoint}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.isCircuitOpen = true;
      this.logger.error(
        `[WUZMIND_CIRCUIT] Circuit OPENED after ${this.consecutiveFailures} consecutive failures. Pausing calls for ${
          this.circuitResetTimeMs / 1000
        }s.`,
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: unknown },
  ): Promise<T | null> {
    if (!this.checkCircuit()) {
      this.logger.warn(`[WUZMIND_FALLBACK] Circuit open or WuzMind disabled. Skipping ${endpoint}`);
      return null;
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const correlationId = `wm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const startTime = Date.now();

    const safeHeaders = {
      'Content-Type': 'application/json',
      ...(this.config.apiKey ? { 'x-wuzmind-api-key': '***' } : {}),
    };

    this.logger.debug(
      `[WUZMIND_REQUEST] [${correlationId}] ${options.method ?? 'GET'} ${url}\nHeaders: ${JSON.stringify(
        safeHeaders,
      )}\nBody: ${JSON.stringify(options.body ?? {})}`,
    );

    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: this.getHeaders(),
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.warn(
          `[WUZMIND_RESPONSE] [${correlationId}] Error ${response.status} (${durationMs}ms): ${errorText}`,
        );
        if (response.status >= 500) {
          this.recordFailure(new Error(`HTTP ${response.status}`), endpoint);
        }
        return null;
      }

      const data = (await response.json()) as T;
      this.recordSuccess();

      this.logger.debug(
        `[WUZMIND_RESPONSE] [${correlationId}] ${response.status} OK (${durationMs}ms)\nData: ${JSON.stringify(
          data,
        )}`,
      );
      return data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.warn(`[WUZMIND_TIMEOUT] [${correlationId}] Request timed out after ${durationMs}ms`);
      } else {
        this.logger.warn(
          `[WUZMIND_FALLBACK] [${correlationId}] Network error (${durationMs}ms): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      this.recordFailure(error, endpoint);
      return null;
    }
  }

  async health(): Promise<{ status: string; providers?: Record<string, unknown> }> {
    const res = await this.request<{ status: string; providers?: Record<string, unknown> }>(
      '/health',
      { method: 'GET' },
    );
    return res ?? { status: 'down' };
  }

  async classifyIntent(dto: IntentClassifyRequestDto): Promise<IntentClassifyResponseDto> {
    const text = dto.text ?? dto.message ?? '';
    const payload = {
      ...dto,
      message: text,
      text: text,
    };

    const res = await this.request<IntentClassifyResponseDto>('/v1/intent/classify', {
      method: 'POST',
      body: payload,
    });

    if (!res) {
      return {
        intent: IntentEnum.DESCONHECIDA,
        confidence: 0,
        entities: {},
        suggestedAction: SuggestedActionEnum.STATIC_FALLBACK,
        provider: 'STATIC_FALLBACK',
      };
    }

    if (res.confidence < this.config.minConfidence) {
      this.logger.log(
        `[WUZMIND_LOW_CONFIDENCE] Intent ${res.intent} confidence ${res.confidence} < threshold ${this.config.minConfidence}`,
      );
    }

    return res;
  }

  async recoverConversation(dto: RecoveryRequestDto): Promise<RecoveryResponseDto> {
    const text = dto.text ?? dto.message ?? '';
    const payload = {
      ...dto,
      message: text,
      text: text,
    };

    const res = await this.request<RecoveryResponseDto>('/v1/recovery', {
      method: 'POST',
      body: payload,
    });

    if (!res) {
      return {
        action: SuggestedActionEnum.STATIC_FALLBACK,
        message:
          'Estou aguardando a seleção de uma das opções abaixo para continuarmos.\n\nDigite MENU para voltar ao início.',
        intent: IntentEnum.FORA_DE_ESCOPO,
        confidence: 0,
        provider: 'STATIC_FALLBACK',
      };
    }

    return res;
  }

  async detectHumanBehavior(dto: DetectHumanBehaviorDto): Promise<HumanBehaviorResponseDto> {
    const text = dto.text ?? dto.message ?? '';
    const payload = {
      ...dto,
      message: text,
      text: text,
    };

    const res = await this.request<HumanBehaviorResponseDto>('/v1/human-behavior/detect', {
      method: 'POST',
      body: payload,
    });

    return (
      res ?? {
        isHumanBehavior: false,
        category: null,
      }
    );
  }

  async classifyMedia(dto: MediaClassifyRequestDto): Promise<MediaClassifyResponseDto> {
    const res = await this.request<MediaClassifyResponseDto>('/v1/media/classify', {
      method: 'POST',
      body: dto,
    });

    if (!res) {
      return {
        classification: MediaClassificationEnum.DESCONHECIDO,
        confidence: 0,
        suggestedAction: SuggestedActionEnum.NO_ACTION,
        provider: 'STATIC_FALLBACK',
      };
    }

    return res;
  }

  async getContext(phone: string): Promise<WuzMindContextDto | null> {
    return this.request<WuzMindContextDto>(`/v1/context/${encodeURIComponent(phone)}`, {
      method: 'GET',
    });
  }

  async updateContext(phone: string, dto: WuzMindContextDto): Promise<WuzMindContextDto> {
    const res = await this.request<WuzMindContextDto>(
      `/v1/context/${encodeURIComponent(phone)}`,
      {
        method: 'PUT',
        body: dto,
      },
    );
    return res ?? dto;
  }

  async deleteContext(phone: string): Promise<boolean> {
    const res = await this.request<{ success?: boolean }>(
      `/v1/context/${encodeURIComponent(phone)}`,
      {
        method: 'DELETE',
      },
    );
    return res !== null;
  }
}
