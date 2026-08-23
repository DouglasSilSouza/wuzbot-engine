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
import { HumanBehaviorService } from '../human-behavior/human-behavior.service';
import { IntentRoutingService } from '../routing/intent-routing.service';
import { RecoveryModeService } from '../recovery/recovery.service';
import { WuzMindMediaRoutingService } from '../media-routing/wuzmind-media-routing.service';
import { ContextManagerService } from '../context/context-manager.service';
import { WuzMindContextSyncService } from '../context/wuzmind-context-sync.service';

@Injectable()
export class ConversationEngine {
  private readonly logger = new Logger(ConversationEngine.name);

  constructor(
    private readonly sessions: SessionManager,
    private readonly translator: MessageTranslator,
    @Inject(CONVERSATION_PROVIDER) private readonly provider: ConversationProvider,
    private readonly globalCommands: GlobalCommandService,
    private readonly humanBehavior: HumanBehaviorService,
    private readonly intentRouter: IntentRoutingService,
    private readonly recoveryMode: RecoveryModeService,
    private readonly mediaRouter: WuzMindMediaRoutingService,
    private readonly contextManager: ContextManagerService,
    private readonly contextSync: WuzMindContextSyncService,
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
        await this.contextSync.clearBoth(input.phone);
        const { initialOutputs } = await this.sessions.resetSession(input.phone);
        return initialOutputs.map((output) => this.translator.fromTypebot(output));
      }

      if (globalCmd.command === 'SAIR') {
        this.logger.log(`[GLOBAL_COMMAND] Executing SAIR session termination for ${input.phone}`);
        await this.contextSync.clearBoth(input.phone);
        const existing = await this.sessions.findByPhone(input.phone);
        if (existing) {
          existing.status = 'EXPIRED';
        }
        return [
          {
            type: CanonicalOutputType.TEXT,
            text:
              globalCmd.responseMessage ??
              'Sua sessão foi encerrada com sucesso. Quando quiser voltar, basta mandar uma mensagem!',
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
              '📌 *Comandos Rápidos Disponíveis:*\n• *MENU*: Volta ao início.\n• *SAIR*: Encerra o atendimento.',
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
    // 2. Classificação de Mídias Recebidas Fora de Fluxo
    // ==========================================
    if (
      input.type !== CanonicalInputType.TEXT &&
      input.type !== CanonicalInputType.BUTTON_REPLY &&
      input.type !== CanonicalInputType.LIST_REPLY
    ) {
      const mediaResult = await this.mediaRouter.classifyAndRoute(input);
      if (mediaResult.userOutputs && mediaResult.userOutputs.length > 0) {
        return mediaResult.userOutputs;
      }
    }

    const existing = await this.sessions.findByPhone(input.phone);

    // ==========================================
    // 3. Usuário Sem Sessão Ativa
    // ==========================================
    if (!existing?.typebotSessionId || existing.status !== 'ACTIVE') {
      this.logger.log(`Starting new session for phone ${input.phone}`);

      // 3.1. Human Behavior Fast Greeting Check
      const humanCheck = await this.humanBehavior.detect(rawText);

      // 3.2. Intent Routing (Se o usuário enviou uma frase com intenção rica)
      if (!humanCheck.isHumanBehavior && rawText.length > 3) {
        const routeDecision = await this.intentRouter.evaluate(input.phone, rawText);
        if (routeDecision.shouldRoute && routeDecision.mapped) {
          const { initialOutputs } = await this.sessions.startSession(input.phone, {
            prefilledVariables: routeDecision.mapped.prefilledVariables,
          });
          await this.contextManager.setLastIntent(input.phone, routeDecision.mapped.intent);
          await this.contextSync.syncToRemote(input.phone);
          return initialOutputs.map((output) => this.translator.fromTypebot(output));
        }
      }

      // 3.3. Início Padrão do Typebot
      const { initialOutputs } = await this.sessions.startSession(input.phone);
      await this.contextSync.syncToRemote(input.phone);
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
      // 4.1. Verificação de Interceptação Cognitiva (Mid-session routing via WuzMind)
      const needsAiEvaluation = outputs.some(
        (out) => out.type === CanonicalOutputType.TEXT && out.text?.includes('__WUZMIND_EVALUATE__'),
      );

      if (needsAiEvaluation && rawText.length > 0) {
        this.logger.log(`[WUZMIND_EVALUATE] Typebot requested AI evaluation for input: "${rawText}"`);
        const routeDecision = await this.intentRouter.evaluate(input.phone, rawText);
        
        if (routeDecision.shouldRoute && routeDecision.mapped) {
          this.logger.log(`[WUZMIND_REDIRECT] Redirecting user to flow ${routeDecision.mapped.targetFlow}`);
          
          await this.sessions.resetSession(input.phone);
          const { initialOutputs } = await this.sessions.startSession(input.phone, {
            prefilledVariables: routeDecision.mapped.prefilledVariables,
          });
          
          await this.contextManager.setLastIntent(input.phone, routeDecision.mapped.intent);
          await this.contextSync.syncToRemote(input.phone);
          return initialOutputs.map((output) => this.translator.fromTypebot(output));
        } else {
          return [
            {
              type: CanonicalOutputType.TEXT,
              text: 'Desculpe, não consegui entender o que você quis dizer. Pode tentar de outra forma?',
            },
          ];
        }
      }

      // 4.2. Verificação de Recuperação Cognitiva (Recovery Mode)
      const choiceOutput = outputs.find(
        (out) =>
          out.type === CanonicalOutputType.BUTTONS ||
          out.type === CanonicalOutputType.LIST,
      );

      // Se o Typebot devolveu opções interativas e o input do usuário foi texto livre que não bate com as opções
      if (choiceOutput && choiceOutput.options && choiceOutput.options.length > 0) {
        const isMatchedOption = choiceOutput.options.some(
          (opt) =>
            opt.label.trim().toLowerCase() === rawText.toLowerCase() ||
            opt.value?.trim().toLowerCase() === rawText.toLowerCase() ||
            opt.id === rawText,
        );

        if (!isMatchedOption && rawText.length > 0 && input.type === CanonicalInputType.TEXT) {
          const recoveryDecision = await this.recoveryMode.handleRecovery(
            input.phone,
            rawText,
            choiceOutput.options,
          );

          // Se o WuzMind identificou qual opção o usuário quis escolher, avança automaticamente no Typebot!
          if (recoveryDecision.matchedOption && existing.typebotSessionId) {
            this.logger.log(
              `[WUZMIND_AUTO_FORWARD] Auto-forwarding matched option "${recoveryDecision.matchedOption.label}" to Typebot session ${existing.typebotSessionId}`,
            );
            const forwardedInput: CanonicalUserInput = {
              phone: input.phone,
              externalMessageId: `fwd_${input.externalMessageId}`,
              type: CanonicalInputType.TEXT,
              text: recoveryDecision.matchedOption.label,
              selection: recoveryDecision.matchedOption,
              receivedAt: new Date(),
            };
            const nextOutputs = await this.provider.sendInput(
              existing.typebotSessionId,
              forwardedInput,
            );
            await this.sessions.touch(input.phone);
            await this.contextSync.syncToRemote(input.phone);
            return nextOutputs.map((output) => this.translator.fromTypebot(output));
          }

          return recoveryDecision.outputs.map((output) => this.translator.fromTypebot(output));
        }
      }

      await this.contextSync.syncToRemote(input.phone);
      return outputs.map((output) => this.translator.fromTypebot(output));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        (error as { status?: number })?.status === 404
      ) {
        this.logger.warn(
          `Session ${existing.typebotSessionId} expired or not found. Restarting session for ${input.phone}.`,
        );
        const { initialOutputs } = await this.sessions.resetSession(input.phone);
        await this.contextSync.syncToRemote(input.phone);
        return initialOutputs.map((output) => this.translator.fromTypebot(output));
      }
      throw error;
    }
  }
}
