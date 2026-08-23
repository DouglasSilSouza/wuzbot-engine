import { Injectable, Logger } from '@nestjs/common';

export type GlobalCommandType = 'MENU' | 'SAIR' | 'AJUDA' | 'CONTINUAR';

export interface GlobalCommandResult {
  isGlobalCommand: boolean;
  command?: GlobalCommandType;
  responseMessage?: string;
}

@Injectable()
export class GlobalCommandService {
  private readonly logger = new Logger(GlobalCommandService.name);

  private readonly MENU_PATTERNS = [
    /^(\/)?menu$/i,
    /^(\/)?in[ií]cio$/i,
    /^(\/)?reiniciar$/i,
    /^(\/)?voltar( ao come[cç]o)?$/i,
    /^(\/)?come[cç]ar$/i,
  ];

  private readonly SAIR_PATTERNS = [
    /^(\/)?sair$/i,
    /^(\/)?cancelar$/i,
    /^(\/)?encerrar$/i,
    /^(\/)?finalizar$/i,
    /^(\/)?tchau$/i,
    /^(\/)?parar$/i,
  ];

  private readonly AJUDA_PATTERNS = [
    /^(\/)?ajuda$/i,
    /^(\/)?help$/i,
    /^(\/)?como funciona$/i,
    /^(\/)?comandos$/i,
    /^(\/)?socorro$/i,
  ];

  private readonly CONTINUAR_PATTERNS = [
    /^(\/)?continuar$/i,
    /^(\/)?retomar$/i,
    /^(\/)?seguir$/i,
  ];

  detect(text?: string | null): GlobalCommandResult {
    if (!text || typeof text !== 'string') {
      return { isGlobalCommand: false };
    }

    const trimmed = text.trim();

    if (this.MENU_PATTERNS.some((p) => p.test(trimmed))) {
      this.logger.log(`[GLOBAL_COMMAND] Detected MENU command`);
      return {
        isGlobalCommand: true,
        command: 'MENU',
      };
    }

    if (this.SAIR_PATTERNS.some((p) => p.test(trimmed))) {
      this.logger.log(`[GLOBAL_COMMAND] Detected SAIR command`);
      return {
        isGlobalCommand: true,
        command: 'SAIR',
        responseMessage:
          'Sua sessão foi encerrada com sucesso. Quando quiser conversar novamente, basta enviar uma mensagem!',
      };
    }

    if (this.AJUDA_PATTERNS.some((p) => p.test(trimmed))) {
      this.logger.log(`[GLOBAL_COMMAND] Detected AJUDA command`);
      return {
        isGlobalCommand: true,
        command: 'AJUDA',
        responseMessage:
          '📌 *Comandos Rápidos Disponíveis:*\n\n' +
          '• *MENU* ou *INÍCIO*: Reinicia e volta ao menu principal.\n' +
          '• *CONTINUAR*: Retoma o atendimento onde você parou.\n' +
          '• *SAIR*: Encerra o atendimento atual.\n' +
          '• *AJUDA*: Exibe esta mensagem de ajuda.',
      };
    }

    if (this.CONTINUAR_PATTERNS.some((p) => p.test(trimmed))) {
      this.logger.log(`[GLOBAL_COMMAND] Detected CONTINUAR command`);
      return {
        isGlobalCommand: true,
        command: 'CONTINUAR',
      };
    }

    return { isGlobalCommand: false };
  }
}
