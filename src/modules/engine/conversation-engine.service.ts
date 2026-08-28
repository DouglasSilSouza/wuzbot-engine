import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CONVERSATION_PROVIDER, ConversationProvider } from '../typebot/conversation-provider.interface';
import {
  CanonicalInputType,
  CanonicalOutput,
  CanonicalOutputType,
  CanonicalUserInput,
} from '../translation/canonical.types';
import { MessageTranslator } from '../translation/message-translator.service';
import { SessionManager } from '../sessions/session-manager.service';
import { GlobalCommandService } from '../commands/global-command.service';
import { ContextManagerService } from '../context/context-manager.service';

export const MAX_CONSECUTIVE_INVALID_ATTEMPTS = 3;

@Injectable()
export class ConversationEngine {
  private readonly logger = new Logger(ConversationEngine.name);

  constructor(
    private readonly sessions: SessionManager,
    private readonly translator: MessageTranslator,
    @Inject(CONVERSATION_PROVIDER) private readonly provider: ConversationProvider,
    private readonly globalCommands: GlobalCommandService,
    private readonly contextManager: ContextManagerService,
  ) {}

  async handle(input: CanonicalUserInput): Promise<CanonicalOutput[]> {
    const rawText = input.text?.trim() ?? '';

    // ==========================================
    // 1. Intercepção de Comandos Globais Locais (MENU, SAIR, AJUDA, CONTINUAR)
    // ==========================================
    const globalCmd = this.globalCommands.detect(rawText);
    if (globalCmd.isGlobalCommand && globalCmd.command) {
      if (globalCmd.command === 'MENU') {
        this.logger.log(`[GLOBAL_COMMAND] Executing MENU reset for ${input.phone}`);
        await this.contextManager.resetContext(input.phone);
        const { initialOutputs } = await this.sessions.resetSession(input.phone);
        return initialOutputs.map((output) => this.translator.fromTypebot(output));
      }

      // Regra: Palavra "sair" encerra a sessão
      if (globalCmd.command === 'SAIR') {
        this.logger.log(`[GLOBAL_COMMAND] Executing SAIR session termination for ${input.phone}`);
        await this.contextManager.resetContext(input.phone);
        await this.sessions.expireSession(input.phone);
        return [
          {
            type: CanonicalOutputType.TEXT,
            text:
              globalCmd.responseMessage ??
              '👋 *Atendimento encerrado com sucesso.*\n\nQuando quiser iniciar uma nova conversa, basta mandar uma mensagem ou digitar *MENU*!',
          },
        ];
      }

      if (globalCmd.command === 'AJUDA') {
        this.logger.log(`[GLOBAL_COMMAND] Returning AJUDA response for ${input.phone}`);
        return [
          {
            type: CanonicalOutputType.TEXT,
            text:
              globalCmd.responseMessage ??
              '📌 *Comandos Rápidos Disponíveis:*\n• *MENU*: Volta ao início do atendimento.\n• *SAIR*: Encerra o atendimento atual.\n• *AJUDA*: Exibe esta mensagem de ajuda.',
          },
        ];
      }

      if (globalCmd.command === 'CONTINUAR') {
        this.logger.log(`[GLOBAL_COMMAND] Continuing current state for ${input.phone}`);
        await this.sessions.touch(input.phone);
        return [
          {
            type: CanonicalOutputType.TEXT,
            text: 'Perfeito! Estamos continuando seu atendimento.',
          },
        ];
      }
    }

    // ==========================================
    // 2. Tratamento Determinístico de Áudio
    // ==========================================
    if (input.type === CanonicalInputType.AUDIO) {
      this.logger.log(`[AUDIO_HANDLER] Audio message received from ${input.phone}`);
      return [
        {
          type: CanonicalOutputType.BUTTONS,
          text: '🎙️ *Áudio recebido!*\n\nPara agilizar seu atendimento, por favor selecione uma opção ou envie sua solicitação em texto:',
          options: [
            { id: 'btn_menu_principal', label: 'Menu Principal', value: 'MENU' },
            { id: 'btn_ajuda', label: 'Ajuda', value: 'AJUDA' },
          ],
        },
      ];
    }

    // Regra: Mais de 30 minutos inativo encerra sessão (findByPhone já valida o TTL de 30min)
    const existing = await this.sessions.findByPhone(input.phone);

    // ==========================================
    // 3. Usuário Sem Sessão Ativa (ou Expirada por Inatividade > 30min) ➔ Inicia Nova Sessão
    // ==========================================
    if (!existing?.typebotSessionId || existing.status !== 'ACTIVE') {
      this.logger.log(`Starting new Typebot session for phone ${input.phone}`);
      const { initialOutputs } = await this.sessions.startSession(input.phone);
      return initialOutputs.map((output) => this.translator.fromTypebot(output));
    }

    // ==========================================
    // 4. Continuação da Sessão Ativa no Typebot
    // ==========================================
    try {
      this.logger.log(
        `Continuing session ${existing.typebotSessionId} for phone ${input.phone}`,
      );
      const outputs = await this.provider.sendInput(existing.typebotSessionId, input);
      await this.sessions.touch(input.phone);

      // Reset de tentativas inválidas após interação bem-sucedida
      await this.sessions.resetInvalidAttempts(input.phone);

      return outputs.map((output) => this.translator.fromTypebot(output));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        (error as { status?: number })?.status === 404
      ) {
        this.logger.warn(
          `Session ${existing.typebotSessionId} expired or not found in Typebot. Restarting session for ${input.phone}.`,
        );
        const { initialOutputs } = await this.sessions.resetSession(input.phone);
        return initialOutputs.map((output) => this.translator.fromTypebot(output));
      }

      // Regra: Máximo 3 mensagens consecutivas fora do fluxo / com erro encerra a sessão
      const currentAttempts = await this.sessions.recordInvalidAttempt(input.phone);
      this.logger.warn(
        `[TYPEBOT_INVALID_ATTEMPT] Attempt ${currentAttempts}/${MAX_CONSECUTIVE_INVALID_ATTEMPTS} for ${input.phone}`,
      );

      if (currentAttempts >= MAX_CONSECUTIVE_INVALID_ATTEMPTS) {
        this.logger.log(`[SESSION_EXPIRED] Exceeded 3 invalid attempts. Terminating session for ${input.phone}.`);
        await this.contextManager.resetContext(input.phone);
        await this.sessions.expireSession(input.phone);
        return [
          {
            type: CanonicalOutputType.TEXT,
            text:
              '⚠️ *Sessão encerrada por excesso de tentativas fora de fluxo.* (3/3)\n\nQuando desejar iniciar um novo atendimento, basta digitar *MENU*.',
          },
        ];
      }

      this.logger.error(
        `[TYPEBOT_ERROR] Falha ao continuar sessão ${existing.typebotSessionId} para ${input.phone}: ${error}`,
      );

      return [
        {
          type: CanonicalOutputType.TEXT,
          text:
            `⚠️ Opção não reconhecida (Tentativa ${currentAttempts} de ${MAX_CONSECUTIVE_INVALID_ATTEMPTS}). Por favor escolha uma das opções ou digite *MENU* para reiniciar.`,
        },
      ];
    }
  }
}
