import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { WuzapiAdapter } from '../../dist/modules/wuzapi/wuzapi.adapter.js';
import { CanonicalOutputType } from '../../dist/modules/translation/canonical.types.js';

describe('WuzapiAdapter', () => {
  let adapter;
  let originalFetch;
  let fetchCalls = [];

  before(() => {
    process.env.WUZAPI_URL = 'https://wuzapi.example.com';
    process.env.WUZAPI_USER_TOKEN = 'test-wuzapi-token-123';
    process.env.WEBHOOK_SECRET = 'secret-456';
    adapter = new WuzapiAdapter();
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
    fetchCalls = [];
  });

  describe('normalizeWebhook', () => {
    it('should normalize plain text message from HistoryMessage format', () => {
      const payload = {
        chat_jid: '5511999998888@s.whatsapp.net',
        message_id: 'msg_001',
        message_type: 'text',
        text_content: 'Olá, gostaria de ajuda',
        timestamp: '2026-08-22T15:00:00Z',
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511999998888');
      assert.equal(normalized.externalMessageId, 'msg_001');
      assert.equal(normalized.type, 'TEXT');
      assert.equal(normalized.text, 'Olá, gostaria de ajuda');
    });

    it('should normalize event wrapper format with JID and conversation', () => {
      const payload = {
        event: 'Message',
        data: {
          key: {
            remoteJid: '5521988887777@s.whatsapp.net',
            id: 'msg_002',
          },
          conversation: 'Menu inicial',
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5521988887777');
      assert.equal(normalized.externalMessageId, 'msg_002');
      assert.equal(normalized.type, 'TEXT');
      assert.equal(normalized.text, 'Menu inicial');
    });

    it('should normalize list selection reply', () => {
      const payload = {
        chat_jid: '5511955554444@s.whatsapp.net',
        message_id: 'msg_003',
        list_reply: {
          id: 'opt_relatorios',
          title: 'Relatórios',
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511955554444');
      assert.equal(normalized.type, 'LIST_REPLY');
      assert.equal(normalized.text, 'Relatórios');
      assert.deepEqual(normalized.selection, {
        id: 'opt_relatorios',
        label: 'Relatórios',
        value: 'opt_relatorios',
      });
    });

    it('should normalize button selection reply', () => {
      const payload = {
        chat_jid: '5511955554444@s.whatsapp.net',
        message_id: 'msg_004',
        button_reply: {
          id: 'btn_opcao_1',
          title: 'Opção 1',
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511955554444');
      assert.equal(normalized.type, 'BUTTON_REPLY');
      assert.equal(normalized.text, 'Opção 1');
      assert.deepEqual(normalized.selection, {
        id: 'btn_opcao_1',
        label: 'Opção 1',
        value: 'btn_opcao_1',
      });
    });

    it('should normalize PascalCase payload format', () => {
      const payload = {
        Phone: '5511988889999',
        Body: 'Quero extrato',
        Id: 'msg_pascal_1',
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511988889999');
      assert.equal(normalized.externalMessageId, 'msg_pascal_1');
      assert.equal(normalized.type, 'TEXT');
      assert.equal(normalized.text, 'Quero extrato');
    });

    it('should normalize extendedTextMessage and Baileys listResponseMessage', () => {
      const payload = {
        data: {
          key: {
            remoteJid: '5511977776666@s.whatsapp.net',
            id: 'msg_ext_1',
          },
          message: {
            listResponseMessage: {
              title: 'Opção 2',
              singleSelectReply: {
                selectedRowId: 'opt_2',
              },
            },
          },
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511977776666');
      assert.equal(normalized.externalMessageId, 'msg_ext_1');
      assert.equal(normalized.type, 'LIST_REPLY');
      assert.equal(normalized.text, 'Opção 2');
    });

    it('should natively normalize real Wuzapi payload structure with body.event.Info and body.event.Message', () => {
      const payload = {
        body: {
          event: {
            Info: {
              ID: 'ACE0C69607F0FEFD65B547D41E004475',
              Sender: '133268657709129@lid',
              SenderAlt: '5511953869941@s.whatsapp.net',
              Type: 'text',
            },
            Message: {
              conversation: 'Teste',
            },
          },
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511953869941');
      assert.equal(normalized.externalMessageId, 'ACE0C69607F0FEFD65B547D41E004475');
      assert.equal(normalized.type, 'TEXT');
      assert.equal(normalized.text, 'Teste');
    });


    it('should natively normalize real Wuzapi payload with extendedTextMessage and Sender', () => {
      const payload = {
        event: {
          Info: {
            ID: 'MSG_REAL_002',
            Sender: '5511988887777@s.whatsapp.net',
            Type: 'text',
          },
          Message: {
            extendedTextMessage: {
              text: 'Mensagem com texto estendido',
            },
          },
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511988887777');
      assert.equal(normalized.externalMessageId, 'MSG_REAL_002');
      assert.equal(normalized.type, 'TEXT');
      assert.equal(normalized.text, 'Mensagem com texto estendido');
    });

    it('should natively normalize real Wuzapi payload with imageMessage', () => {
      const payload = {
        event: {
          Info: {
            ID: 'MSG_REAL_003',
            SenderAlt: '5511953869941@s.whatsapp.net',
            Type: 'image',
          },
          Message: {
            imageMessage: {
              url: 'https://media.example.com/img.jpg',
              mimetype: 'image/jpeg',
              caption: 'Comprovante Pix',
            },
          },
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511953869941');
      assert.equal(normalized.externalMessageId, 'MSG_REAL_003');
      assert.equal(normalized.type, 'IMAGE');
      assert.equal(normalized.text, 'Comprovante Pix');
      assert.equal(normalized.media.url, 'https://media.example.com/img.jpg');
      assert.equal(normalized.media.mimeType, 'image/jpeg');
    });

    it('should natively normalize real Wuzapi payload with multi-device device suffix (:74)', () => {
      const payload = {
        body: {
          event: {
            Info: {
              ID: 'ACE0C69607F0FEFD65B547D41E004475',
              Sender: '133268657709129:74@lid',
              SenderAlt: '5511953869941:74@s.whatsapp.net',
              Type: 'text',
            },
            Message: {
              conversation: 'Teste com device index',
            },
          },
        },
      };

      const normalized = adapter.normalizeWebhook(payload);
      assert.equal(normalized.phone, '5511953869941');
      assert.equal(normalized.externalMessageId, 'ACE0C69607F0FEFD65B547D41E004475');
      assert.equal(normalized.type, 'TEXT');
      assert.equal(normalized.text, 'Teste com device index');
    });

    it('should throw BadRequestException if phone is missing', () => {
      assert.throws(() => adapter.normalizeWebhook({ text_content: 'no phone' }), {
        name: 'BadRequestException',
      });
    });

    it('should generate fallback ID when message ID is omitted', () => {
      const normalized = adapter.normalizeWebhook({
        phone: '5511999998888',
        text: 'Teste sem id',
      });
      assert.equal(normalized.phone, '5511999998888');
      assert.match(normalized.externalMessageId, /^wuz_/);
      assert.equal(normalized.text, 'Teste sem id');
    });
  });

  describe('normalizePhone', () => {
    it('should strip @s.whatsapp.net domain', () => {
      assert.equal(adapter.normalizePhone('5511953869941@s.whatsapp.net'), '5511953869941');
    });

    it('should strip multi-device :74 suffix from @s.whatsapp.net JID', () => {
      assert.equal(adapter.normalizePhone('5511953869941:74@s.whatsapp.net'), '5511953869941');
    });

    it('should strip @lid domain', () => {
      assert.equal(adapter.normalizePhone('133268657709129@lid'), '133268657709129');
    });

    it('should strip multi-device :74 suffix from @lid JID', () => {
      assert.equal(adapter.normalizePhone('133268657709129:74@lid'), '133268657709129');
    });

    it('should normalize formatted phone numbers with country code', () => {
      assert.equal(adapter.normalizePhone('+55 (11) 95386-9941'), '5511953869941');
    });
  });




  describe('validateWebhookSecret', () => {
    it('should accept requests with or without secret', () => {
      assert.doesNotThrow(() => adapter.validateWebhookSecret('secret-456'));
      assert.doesNotThrow(() => adapter.validateWebhookSecret('wrong-secret'));
      assert.doesNotThrow(() => adapter.validateWebhookSecret(undefined));
    });
  });


  describe('send', () => {
    before(() => {
      originalFetch = global.fetch;
    });

    it('should send text using /chat/send/text with token header and Phone/Body format', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz-1' } }),
        };
      };

      await adapter.send('5511999998888', {
        type: CanonicalOutputType.TEXT,
        text: 'Olá! Como posso ajudar?',
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://wuzapi.example.com/chat/send/text');
      assert.equal(fetchCalls[0].options.headers.token, 'test-wuzapi-token-123');
      assert.equal(fetchCalls[0].options.headers['Content-Type'], 'application/json');

      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.Phone, '5511999998888');
      assert.equal(body.Body, 'Olá! Como posso ajudar?');
    });

    it('should send list using /chat/send/list with token header and list items', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz-2' } }),
        };
      };

      await adapter.send('5511999998888', {
        type: CanonicalOutputType.LIST,
        text: 'Selecione uma opção:',
        options: [
          { id: 'opt_1', label: 'Opção 1', value: 'opt_1' },
          { id: 'opt_2', label: 'Opção 2', value: 'opt_2' },
        ],
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://wuzapi.example.com/chat/send/list');
      assert.equal(fetchCalls[0].options.headers.token, 'test-wuzapi-token-123');

      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.Phone, '5511999998888');
      assert.equal(body.ButtonText, 'Selecionar');
      assert.equal(body.TopText, 'Opções');
      assert.equal(body.Desc, 'Selecione uma opção:');
      assert.equal(body.List.length, 2);

      assert.equal(body.List[0].title, 'Opção 1');
      assert.equal(body.List[0].RowId, 'Opção 1');
      assert.equal(body.List[1].title, 'Opção 2');
      assert.equal(body.List[1].RowId, 'Opção 2');
    });

    it('should send image using /chat/send/image with data url and caption', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz-3' } }),
        };
      };

      await adapter.send('5511999998888', {
        type: CanonicalOutputType.IMAGE,
        media: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          caption: 'Comprovante',
        },
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://wuzapi.example.com/chat/send/image');
      assert.equal(fetchCalls[0].options.headers.token, 'test-wuzapi-token-123');

      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.Phone, '5511999998888');
      assert.match(body.Image, /^data:image\/png;base64,/);
      assert.equal(body.Caption, 'Comprovante');
    });

    it('should send buttons using /chat/send/buttons with Buttons format', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz-4' } }),
        };
      };

      await adapter.send('5511999998888', {
        type: CanonicalOutputType.BUTTONS,
        text: 'Escolha uma opção:',
        options: [
          { id: 'sim', label: 'Sim', value: 'sim' },
          { id: 'nao', label: 'Não', value: 'nao' },
        ],
      });

      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://wuzapi.example.com/chat/send/buttons');
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.Phone, '5511999998888');
      assert.equal(body.Body, 'Escolha uma opção:');
      assert.match(body.Id, /^wuz_btn_/);
      assert.equal(body.Buttons.length, 2);
      assert.equal(body.Buttons[0].title, 'Sim');
      assert.equal(body.Buttons[0].id, 'Sim');
      assert.equal(body.Buttons[1].title, 'Não');
      assert.equal(body.Buttons[1].id, 'Não');
    });


    it('should gracefully fallback to /chat/send/list when /chat/send/buttons fails', async () => {
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        if (url.includes('/chat/send/buttons')) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ success: false, code: 400, message: 'Buttons not supported' }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, code: 200, data: { Details: 'Sent', Id: 'wuz-5' } }),
        };
      };

      await adapter.send('5511999998888', {
        type: CanonicalOutputType.BUTTONS,
        text: 'Escolha uma opção:',
        options: [
          { id: 'opt1', label: 'Opção 1', value: 'opt1' },
          { id: 'opt2', label: 'Opção 2', value: 'opt2' },
        ],
      });

      assert.equal(fetchCalls.length, 2);
      assert.equal(fetchCalls[0].url, 'https://wuzapi.example.com/chat/send/buttons');
      assert.equal(fetchCalls[1].url, 'https://wuzapi.example.com/chat/send/list');
      const fallbackBody = JSON.parse(fetchCalls[1].options.body);
      assert.equal(fallbackBody.List.length, 2);
      assert.equal(fallbackBody.List[0].title, 'Opção 1');
    });
  });
});

