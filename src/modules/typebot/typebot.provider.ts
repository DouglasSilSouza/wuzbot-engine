import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CanonicalInputType, CanonicalOutput, CanonicalOutputType, CanonicalOption, CanonicalUserInput } from '../translation/canonical.types';
import { ConversationProvider, ConversationSession } from './conversation-provider.interface';

interface TypebotResponse {
  sessionId?: string;
  messages?: Array<{ type?: string; content?: unknown; id?: string }>;
  input?: { type?: string; items?: Array<{ id?: string; content?: string; value?: string }> };
}

@Injectable()
export class TypebotProvider implements ConversationProvider {
  private readonly logger = new Logger(TypebotProvider.name);
  private readonly baseUrl = (process.env.TYPEBOT_BASE_URL ?? '').replace(/\/$/, '');
  private readonly publicId = process.env.TYPEBOT_PUBLIC_ID ?? '';
  private readonly token = process.env.TYPEBOT_TOKEN ?? process.env.TYPEBOT_API_KEY;

  async createSession(
    phone: string,
    options?: { prefilledVariables?: Record<string, string> },
  ): Promise<ConversationSession> {
    this.logger.log(`[Typebot] Starting new session for phone ${phone} (publicId: ${this.publicId})`);
    const prefilled = {
      Phone: phone,
      phone: phone,
      user_phone: phone,
      telefone: phone,
      Telefone: phone,
      Channel: 'whatsapp',
      channel: 'whatsapp',
      ...(options?.prefilledVariables ?? {}),
    };
    const response = await this.request(`/api/v1/typebots/${encodeURIComponent(this.publicId)}/startChat`, {
      prefilledVariables: prefilled,
      textBubbleContentFormat: 'richText',
    });
    if (!response.sessionId) throw new ServiceUnavailableException('Typebot did not return a sessionId');
    const initialOutputs = this.toCanonicalOutputs(response);
    this.logger.log(`[Typebot] Session created: ${response.sessionId} (${initialOutputs.length} initial outputs)`);
    return { sessionId: response.sessionId, initialOutputs };
  }

  async sendInput(sessionId: string, input: CanonicalUserInput): Promise<CanonicalOutput[]> {
    const message = this.toTypebotMessage(input);
    const body = {
      message,
      textBubbleContentFormat: 'richText',
    };
    this.logger.debug(`[TYPEBOT_CONTINUE_INPUT]\n${JSON.stringify({ sessionId, ...body }, null, 2)}`);
    this.logger.log(`[Typebot] Sending input to session ${sessionId}: type=${input.type}, text="${message.text ?? ''}"`);
    const response = await this.request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/continueChat`, body);
    const outputs = this.toCanonicalOutputs(response);
    this.logger.log(`[Typebot] Returned ${outputs.length} outputs for session ${sessionId}`);
    return outputs;
  }


  private toTypebotMessage(input: CanonicalUserInput): Record<string, unknown> {
    if (input.type === CanonicalInputType.AUDIO && input.media?.url) return { type: 'audio', url: input.media.url };
    if (input.type === CanonicalInputType.BUTTON_REPLY || input.type === CanonicalInputType.LIST_REPLY) {
      return { type: 'text', text: input.selection?.label ?? input.selection?.value ?? input.text ?? '' };
    }
    return { type: 'text', text: input.text ?? '' };
  }

  private toCanonicalOutputs(response: TypebotResponse): CanonicalOutput[] {
    this.logger.debug(`[Typebot Raw Response]\n${JSON.stringify(response, null, 2)}`);
    const rawMessages = response.messages ?? [];
    const items = response.input?.items ?? [];
    const isChoiceInput = response.input?.type === 'choice input' || items.length > 0;

    let filteredMessages = rawMessages;
    if (isChoiceInput) {
      const hasInvalidChoiceError = rawMessages.some((message) => {
        const text = this.richTextToText(message.content);
        return /invalid message|please,? try again/i.test(text);
      });

      if (hasInvalidChoiceError) {
        this.logger.warn(
          `[TYPEBOT_INVALID_CHOICE_DETECTED] Typebot returned invalid message error alongside choice input. Suppressing error text.`,
        );
        this.logger.log(
          `[TYPEBOT_MENU_REDISPLAY] Redisplaying choice menu (${items.length} options) without error text.`,
        );
        filteredMessages = rawMessages.filter((message) => {
          const text = this.richTextToText(message.content);
          return !/invalid message|please,? try again/i.test(text);
        });
      }
    }

    const outputs = filteredMessages.flatMap((message) => this.toMessage(message));

    if (items.length > 0) {
      const options: CanonicalOption[] = items.map((item) => ({
        id: item.id ?? '',
        label: item.content ?? '',
        value: item.value ?? item.content ?? '',
      }));

      const outputType = options.length <= 3 ? CanonicalOutputType.BUTTONS : CanonicalOutputType.LIST;
      this.logger.log(`[Typebot Choice Input] Found ${options.length} options -> Semantic output: ${outputType}`);

      // Merge choices with the last text bubble to produce a single elegant message on WhatsApp
      const lastOutput = outputs[outputs.length - 1];
      if (lastOutput && lastOutput.type === CanonicalOutputType.TEXT) {
        lastOutput.type = outputType;
        lastOutput.options = options;
      } else {
        outputs.push({
          type: outputType,
          text: 'Escolha uma opção:',
          options,
        });
      }
    }

    this.logger.debug(`[Canonical Outputs Generated]\n${JSON.stringify(outputs, null, 2)}`);
    return outputs;
  }

  private toMessage(message: { type?: string; content?: unknown; id?: string }): CanonicalOutput[] {
    if (message.type === 'text') {
      const text = this.richTextToText(message.content);
      if (!text.trim()) return [];
      return [{ type: CanonicalOutputType.TEXT, text }];
    }
    if (message.type === 'image' || message.type === 'video' || message.type === 'audio') {
      const content = typeof message.content === 'object' && message.content !== null ? message.content as { url?: string } : {};
      const type = message.type.toUpperCase() as CanonicalOutputType;
      return [{ type, media: { url: content.url } }];
    }
    return [];
  }

  private richTextToText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!content || typeof content !== 'object') return '';
    const richText = (content as { richText?: unknown }).richText;
    return this.collectText(richText ?? content).trim();
  }

  private collectText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.map((item) => this.collectText(item)).join('\n');
    }
    if (!value || typeof value !== 'object') return '';
    const node = value as Record<string, unknown>;
    if (typeof node.text === 'string') return node.text;
    if (Array.isArray(node.children)) {
      const joinedChildren = node.children.map((c) => this.collectText(c)).join('');
      return joinedChildren;
    }
    if (node.richText) return this.collectText(node.richText);
    return '';
  }

  private async request(path: string, body: Record<string, unknown>): Promise<TypebotResponse> {
    if (!this.baseUrl || !this.publicId) throw new ServiceUnavailableException('Typebot configuration is incomplete');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null) as TypebotResponse & { message?: string; status?: number };
      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(`Typebot session not found or expired: ${payload?.message ?? '404'}`);
        }
        const error = new Error(`Typebot request failed with HTTP ${response.status}`);
        Object.assign(error, { status: response.status, payload });
        throw error;
      }
      return payload;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(`Typebot temporarily unavailable: ${(error as Error).message}`);
    }
  }
}


