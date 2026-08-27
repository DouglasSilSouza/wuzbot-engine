import {
  BadRequestException,
  Injectable,
  NotImplementedException,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import {
  CanonicalInputType,
  CanonicalMedia,
  CanonicalOutput,
  CanonicalOutputType,
  CanonicalUserInput,
} from '../translation/canonical.types';


@Injectable()
export class WuzapiAdapter {
  private readonly logger = new Logger(WuzapiAdapter.name);
  private readonly baseUrl = (process.env.WUZAPI_URL ?? '').replace(/\/$/, '');
  private readonly token = process.env.WUZAPI_USER_TOKEN ?? process.env.WUZAPI_TOKEN;
  private readonly webhookSecret = process.env.WEBHOOK_SECRET;

  validateWebhookSecret(receivedSecret?: string): void {
    // Validação de secret desabilitada temporariamente (Wuzapi não envia headers customizados no webhook)
    void receivedSecret;
  }


  normalizeWebhook(payload: unknown): CanonicalUserInput {
    if (!payload || typeof payload !== 'object') {
      this.logger.error('Received non-object webhook payload');
      throw new BadRequestException('Invalid Wuzapi payload: expected JSON object');
    }

    // 1. Log detalhado do payload bruto recebido
    this.logger.debug(`[WUZAPI_RAW]\n${JSON.stringify(payload, null, 2)}`);

    const root = payload as Record<string, unknown>;
    const body = this.findObject(root, 'body') ?? root;
    const event = this.findObject(body, 'event') ?? this.findObject(root, 'event') ?? body;
    const info = this.findObject(event, 'info') ?? this.findObject(body, 'info') ?? this.findObject(root, 'info');
    const rawMessage = this.findObject(event, 'rawmessage', 'raw_message') ?? this.findObject(body, 'rawmessage');
    const data = this.findObject(event, 'data') ?? this.findObject(body, 'data') ?? this.findObject(root, 'data');
    const msg = this.findObject(event, 'message')
      ?? this.findObject(data, 'message')
      ?? this.findObject(body, 'message')
      ?? this.findObject(root, 'message')
      ?? rawMessage
      ?? data
      ?? event;
    const key = this.findObject(event, 'key') ?? this.findObject(data, 'key') ?? this.findObject(msg, 'key') ?? this.findObject(root, 'key');
    // 2. Extração de Telefone com prioridade estrita: SenderAlt -> ChatAlt -> Sender -> Chat
    let rawPhoneCandidate = this.findString(info, 'senderalt', 'sender_alt', 'chatalt', 'chat_alt')
      ?? this.findString(event, 'senderalt', 'sender_alt', 'chatalt', 'chat_alt')
      ?? this.findString(data, 'senderalt', 'sender_alt', 'chatalt', 'chat_alt')
      ?? this.findString(body, 'senderalt', 'sender_alt', 'chatalt', 'chat_alt')
      ?? this.findString(root, 'senderalt', 'sender_alt', 'chatalt', 'chat_alt');

    if (!rawPhoneCandidate) {
      rawPhoneCandidate = this.findString(info, 'sender', 'chat', 'senderjid', 'sender_jid', 'chatjid', 'chat_jid')
        ?? this.findString(event, 'sender', 'chat', 'phone', 'from', 'chat_jid', 'chatjid', 'sender_jid', 'senderjid', 'remotejid', 'jid')
        ?? this.findString(data, 'phone', 'from', 'chat_jid', 'chatjid', 'sender_jid', 'senderjid', 'remotejid', 'jid')
        ?? this.findString(body, 'phone', 'from', 'chat_jid', 'chatjid', 'sender_jid', 'senderjid', 'remotejid', 'jid')
        ?? this.findString(root, 'phone', 'from', 'chat_jid', 'chatjid', 'sender_jid', 'senderjid', 'remotejid', 'jid')
        ?? this.findString(key, 'remotejid', 'remote_jid', 'participant', 'jid')
        ?? '';
    }

    const phone = this.normalizePhone(rawPhoneCandidate);

    this.logger.debug(`[PHONE_EXTRACTION] rawPhone="${rawPhoneCandidate}" normalizedPhone="${phone}"`);


    if (!phone) {
      this.logger.warn(`Failed to extract phone from payload: ${JSON.stringify(payload)}`);
      throw new BadRequestException('Wuzapi payload lacks recognizable phone number');
    }

    // 3. Extração de Message ID (suporte nativo a event.Info.ID, etc.)
    const externalMessageId = this.findString(
      info, 'id', 'messageid', 'message_id', 'stanzaid', 'stanza_id',
    ) ?? this.findString(
      event, 'id', 'message_id', 'messageid', 'stanza_id', 'stanzaid',
    ) ?? this.findString(
      key, 'id', 'stanza_id',
    ) ?? this.findString(
      data, 'message_id', 'messageid', 'id',
    ) ?? this.findString(
      body, 'message_id', 'messageid', 'id',
    ) ?? this.findString(
      root, 'message_id', 'messageid', 'id',
    ) ?? `wuz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Extração de Seleção (Botão, Lista, Template)
    const buttonObj = this.findObject(msg, 'buttonsresponsemessage', 'templatebuttonreplymessage', 'button_reply', 'buttonreply')
      ?? this.findObject(data, 'buttonsresponsemessage', 'templatebuttonreplymessage', 'button_reply', 'buttonreply')
      ?? this.findObject(event, 'buttonsresponsemessage', 'templatebuttonreplymessage', 'button_reply', 'buttonreply')
      ?? this.findObject(root, 'buttonsresponsemessage', 'templatebuttonreplymessage', 'button_reply', 'buttonreply');

    const listObj = this.findObject(msg, 'listresponsemessage', 'interactiveresponsemessage', 'list_reply', 'listreply')
      ?? this.findObject(data, 'listresponsemessage', 'interactiveresponsemessage', 'list_reply', 'listreply')
      ?? this.findObject(event, 'listresponsemessage', 'interactiveresponsemessage', 'list_reply', 'listreply')
      ?? this.findObject(root, 'listresponsemessage', 'interactiveresponsemessage', 'list_reply', 'listreply');

    let selection: { id: string; label: string; value: string } | undefined;
    if (buttonObj) {
      const id = this.findString(buttonObj, 'selectedbuttonid', 'selectedid', 'id', 'buttonid') ?? '';
      const label = this.findString(buttonObj, 'selecteddisplaytext', 'title', 'displaytext', 'text') ?? id;
      selection = { id, label, value: id || label };
    } else if (listObj) {
      const singleSelect = this.findObject(listObj, 'singleselectreply', 'single_select_reply');
      const id = this.findString(singleSelect, 'selectedrowid', 'rowid') ?? this.findString(listObj, 'rowid', 'id', 'row_id') ?? '';
      const label = this.findString(listObj, 'title', 'displaytext', 'name') ?? id;
      selection = { id, label, value: id || label };
    }

    // 5. Extração de Mídia
    const media = this.mediaFrom(msg, data, event, body, root);

    // 6. Extração de Texto / Mensagem (suporte a event.Message.conversation, extendedTextMessage.text, etc.)
    const extendedTextObj = this.findObject(msg, 'extendedtextmessage', 'extended_text_message')
      ?? this.findObject(event, 'extendedtextmessage', 'extended_text_message');
    const rawText = selection?.label
      ?? this.findString(msg, 'conversation')
      ?? this.findString(extendedTextObj, 'text')
      ?? this.findString(msg, 'text', 'body', 'text_content', 'textcontent', 'caption')
      ?? this.findString(rawMessage, 'conversation', 'text')
      ?? this.findString(event, 'conversation', 'text', 'body', 'text_content')
      ?? this.findString(data, 'conversation', 'text', 'body', 'text_content')
      ?? this.findString(body, 'conversation', 'text', 'body', 'text_content')
      ?? this.findString(root, 'conversation', 'text', 'body', 'text_content')
      ?? media?.media.caption
      ?? '';

    // 7. Determinação do Tipo Canônico
    const infoType = this.findString(info, 'type')?.toLowerCase();
    let type: CanonicalInputType = CanonicalInputType.TEXT;

    if (buttonObj) {
      type = CanonicalInputType.BUTTON_REPLY;
    } else if (listObj) {
      type = CanonicalInputType.LIST_REPLY;
    } else if (media) {
      type = media.type;
    } else if (infoType === 'image') {
      type = CanonicalInputType.IMAGE;
    } else if (infoType === 'video') {
      type = CanonicalInputType.VIDEO;
    } else if (infoType === 'audio') {
      type = CanonicalInputType.AUDIO;
    } else if (infoType === 'document') {
      type = CanonicalInputType.DOCUMENT;
    } else {
      type = CanonicalInputType.TEXT;
    }

    // 8. Construção do CanonicalUserInput
    const rawTimestamp = this.findValue(info, 'timestamp', 'messagetimestamp')
      ?? this.findValue(event, 'timestamp', 'messagetimestamp')
      ?? this.findValue(body, 'timestamp')
      ?? this.findValue(root, 'timestamp');
    const receivedAt = rawTimestamp ? new Date(typeof rawTimestamp === 'number' && rawTimestamp < 1e12 ? rawTimestamp * 1000 : String(rawTimestamp)) : new Date();

    const normalized: CanonicalUserInput = {
      phone,
      externalMessageId,
      type,
      text: rawText,
      selection,
      media: media?.media,
      receivedAt,
      metadata: root,
    };

    // 9. Logs detalhados
    this.logger.log(`[Wuzapi Inbound] Phone: ${normalized.phone} | ID: ${normalized.externalMessageId} | Type: ${normalized.type} | Text: "${normalized.text}"`);
    this.logger.debug(`[CANONICAL_INPUT]\n${JSON.stringify(normalized, null, 2)}`);

    return normalized;
  }

  async send(phone: string, message: CanonicalOutput): Promise<void> {

    if (!this.baseUrl || !this.token) {
      throw new ServiceUnavailableException('Wuzapi configuration is incomplete (missing WUZAPI_URL or WUZAPI_USER_TOKEN)');
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      token: this.token,
    };

    const request = await this.toWuzapiRequest(phone, message);
    const targetUrl = `${this.baseUrl}${request.path}`;
    this.logger.log(`[Canonical -> Wuzapi] Dispatching ${message.type} request to ${targetUrl} for phone ${phone}`);
    this.logger.debug(
      `[Wuzapi Outbound Request]\n` +
      `URL: ${targetUrl}\n` +
      `Headers: ${JSON.stringify({ ...headers, token: '***' }, null, 2)}\n` +
      `Payload:\n${JSON.stringify(request.body, null, 2)}`
    );

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request.body),
    });

    let responseText = '';
    let responseBody: { success?: boolean; code?: number; message?: string; error?: string; data?: unknown } | null = null;

    if (typeof response.text === 'function') {
      responseText = await response.text();
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = null;
      }
    } else if (typeof response.json === 'function') {
      responseBody = await response.json().catch(() => null);
      responseText = JSON.stringify(responseBody);
    }

    this.logger.debug(
      `[Wuzapi Inbound Response]\n` +
      `URL: ${targetUrl}\n` +
      `Status: ${response.status} ${response.statusText ?? ''}\n` +
      `Body:\n${responseText}`
    );

    if (!response.ok || responseBody?.success === false) {
      this.logger.error(
        `[Wuzapi Send Failed] URL: ${targetUrl} | Status: ${response.status} | Phone: ${phone}\n` +
        `Request Body:\n${JSON.stringify(request.body, null, 2)}\n` +
        `Response Body:\n${responseText}`
      );

      // Se falhar o envio de BUTTONS (ex: 400 retornado pelo Wuzapi), faz fallback resiliente para LIST
      if (message.type === CanonicalOutputType.BUTTONS) {
        this.logger.warn(`[Wuzapi Fallback] Failed sending BUTTONS to ${request.path} (HTTP ${response.status}). Falling back to /chat/send/list.`);
        const fallbackList = this.toListRequest(phone, message);
        const fallbackUrl = `${this.baseUrl}${fallbackList.path}`;
        this.logger.log(`[Wuzapi Fallback] Dispatching LIST to ${fallbackUrl} for phone ${phone}`);
        this.logger.debug(
          `[Wuzapi Fallback Outbound Request]\n` +
          `URL: ${fallbackUrl}\n` +
          `Payload:\n${JSON.stringify(fallbackList.body, null, 2)}`
        );

        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(fallbackList.body),
        });

        let fallbackText = '';
        let fallbackBody: { success?: boolean; code?: number; message?: string; data?: unknown } | null = null;

        if (typeof fallbackResponse.text === 'function') {
          fallbackText = await fallbackResponse.text();
          try {
            fallbackBody = JSON.parse(fallbackText);
          } catch {
            fallbackBody = null;
          }
        } else if (typeof fallbackResponse.json === 'function') {
          fallbackBody = await fallbackResponse.json().catch(() => null);
          fallbackText = JSON.stringify(fallbackBody);
        }

        this.logger.debug(
          `[Wuzapi Fallback Response]\n` +
          `URL: ${fallbackUrl}\n` +
          `Status: ${fallbackResponse.status} ${fallbackResponse.statusText ?? ''}\n` +
          `Body:\n${fallbackText}`
        );

        if (!fallbackResponse.ok || fallbackBody?.success === false) {
          this.logger.error(
            `[Wuzapi Fallback Failed] URL: ${fallbackUrl} | Status: ${fallbackResponse.status} | Phone: ${phone}\n` +
            `Fallback Response Body:\n${fallbackText}`
          );
          throw new ServiceUnavailableException(`Wuzapi send failed with HTTP ${fallbackResponse.status}: ${fallbackText}`);
        }

        this.logger.log(`[Wuzapi Fallback Success] Successfully sent LIST fallback to phone ${phone}`);
        return;
      }

      throw new ServiceUnavailableException(`Wuzapi send failed with HTTP ${response.status}: ${responseText}`);
    }

    this.logger.log(`[Wuzapi Send Success] Successfully sent ${message.type} to phone ${phone}`);
  }

  private async toWuzapiRequest(

    phone: string,
    message: CanonicalOutput,
  ): Promise<{ path: string; body: Record<string, unknown> }> {
    if (message.type === CanonicalOutputType.TEXT) {
      return {
        path: '/chat/send/text',
        body: { Phone: phone, Body: message.text ?? '' },
      };
    }

    if (message.type === CanonicalOutputType.BUTTONS) {
      const generatedId = `wuz_btn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        path: '/chat/send/buttons',
        body: {
          Phone: phone,
          Body: message.text || 'Escolha uma opção:',
          Id: generatedId,
          Buttons: (message.options ?? []).map((option, idx) => ({
            title: option.label || option.value || `Opção ${idx + 1}`,
            id: option.label || option.value || option.id || `btn_${idx + 1}`,
          })),
        },
      };
    }

    if (message.type === CanonicalOutputType.LIST) {
      return this.toListRequest(phone, message);
    }

    if (message.type === CanonicalOutputType.IMAGE && message.media?.url) {
      return {
        path: '/chat/send/image',
        body: {
          Phone: phone,
          Image: await this.toDataUrl(message.media.url),
          Caption: message.media.caption ?? message.text,
        },
      };
    }

    if (message.type === CanonicalOutputType.VIDEO && message.media?.url) {
      return {
        path: '/chat/send/video',
        body: {
          Phone: phone,
          Video: await this.toDataUrl(message.media.url),
          Caption: message.media.caption ?? message.text,
        },
      };
    }

    if (message.type === CanonicalOutputType.AUDIO && message.media?.url) {
      return {
        path: '/chat/send/audio',
        body: {
          Phone: phone,
          Audio: await this.toDataUrl(message.media.url),
        },
      };
    }

    if (message.type === CanonicalOutputType.DOCUMENT && message.media?.url) {
      return {
        path: '/chat/send/document',
        body: {
          Phone: phone,
          Document: await this.toDataUrl(message.media.url),
          FileName: message.media.fileName ?? 'documento',
          Caption: message.media.caption ?? message.text,
        },
      };
    }

    throw new NotImplementedException(`Wuzapi output type ${message.type} is not implemented`);
  }

  private toListRequest(
    phone: string,
    message: CanonicalOutput,
  ): { path: string; body: Record<string, unknown> } {
    return {
      path: '/chat/send/list',
      body: {
        Phone: phone,
        ButtonText: 'Selecionar',
        TopText: 'Opções',
        Desc: message.text || 'Selecione uma opção:',
        List: (message.options ?? []).map((option, idx) => ({
          title: option.label || option.value || `Opção ${idx + 1}`,
          desc: '',
          RowId: option.label || option.value || option.id || `row_${idx + 1}`,
        })),
      },
    };
  }




  private mediaFrom(
    ...sourcesList: (Record<string, unknown> | undefined)[]
  ): { type: CanonicalInputType; media: CanonicalMedia } | undefined {
    const sources = sourcesList.filter(Boolean) as Record<string, unknown>[];

    const types = [
      ['image', 'imagemessage', CanonicalInputType.IMAGE],
      ['document', 'documentmessage', CanonicalInputType.DOCUMENT],
      ['audio', 'audiomessage', CanonicalInputType.AUDIO],
      ['video', 'videomessage', CanonicalInputType.VIDEO],
      ['sticker', 'stickermessage', CanonicalInputType.STICKER],
    ] as const;

    for (const [key1, key2, type] of types) {
      for (const src of sources) {
        const item = this.findObject(src, key1, key2);
        if (item) {
          return {
            type,
            media: {
              mediaId: this.findString(item, 'id', 'file_sha256', 'filesha256') ?? '',
              mimeType: this.findString(item, 'mimetype', 'mime_type') ?? '',
              fileName: this.findString(item, 'filename', 'file_name', 'title') ?? '',
              url: this.findString(item, 'url', 'media_link', 'medialink', 'direct_path', 'directpath')
                ?? sources.map((s) => this.findString(s, 'media_link', 'medialink', 'url')).find(Boolean)
                ?? '',
              caption: this.findString(item, 'caption') ?? '',
            },
          };
        }
      }
    }
    return undefined;
  }



  private findString(obj: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
    const val = this.findValue(obj, ...keys);
    return val !== undefined && val !== null ? String(val).trim() : undefined;
  }

  private findObject(obj: Record<string, unknown> | undefined, ...keys: string[]): Record<string, unknown> | undefined {
    const val = this.findValue(obj, ...keys);
    return val && typeof val === 'object' && !Array.isArray(val) ? (val as Record<string, unknown>) : undefined;
  }

  private findValue(obj: Record<string, unknown> | undefined, ...keys: string[]): unknown {
    if (!obj || typeof obj !== 'object') return undefined;

    const entryMap = new Map<string, unknown>();
    for (const [rawKey, val] of Object.entries(obj)) {
      entryMap.set(rawKey.toLowerCase().replace(/[^a-z0-9]/g, ''), val);
    }

    for (const targetKey of keys) {
      const cleanTargetKey = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      const val = entryMap.get(cleanTargetKey);
      if (val !== undefined && val !== null && val !== '') {
        return val;
      }
    }
    return undefined;
  }


  normalizePhone(phone: string): string {
    if (!phone) return '';
    // 1. Remove domínio do JID (@s.whatsapp.net, @lid, etc.)
    const withoutDomain = phone.split('@')[0];
    // 2. Remove índice de dispositivo multi-device (:74, :1, :0, etc.)
    const withoutDevice = withoutDomain.split(':')[0].trim();
    // 3. Remove caracteres não numéricos (+, -, (, ), espaços)
    return withoutDevice.replace(/\D/g, '');
  }

  private async toDataUrl(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceUnavailableException(`Media download failed with HTTP ${response.status}`);
    }
    const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
    const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
}


