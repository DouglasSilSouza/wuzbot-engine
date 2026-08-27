import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export interface AuthorizedUser {
  id: number;
  nome: string;
  telefone: string;
  perfil: string;
  ativo: boolean;
  pode_ver_gastos: boolean;
  pode_editar_gastos: boolean;
  pode_excluir_gastos: boolean;
  pode_gerenciar_usuarios: boolean;
}

@Injectable()
export class UserAccessService {
  private readonly logger = new Logger(UserAccessService.name);
  private readonly pool: Pool | null;
  private readonly enabled: boolean;

  constructor() {
    const dbUrl = process.env.GASTOS_DATABASE_URL;
    // O controle de acesso é habilitado por padrão. Somente USER_ACCESS_ENABLED=false o desativa.
    this.enabled = process.env.USER_ACCESS_ENABLED !== 'false';
    if (this.enabled && dbUrl) {
      this.pool = new Pool({ connectionString: dbUrl });
    } else {
      this.pool = null;
    }
  }

  /**
   * Verifica se o telefone pertence a um usuário autorizado (cadastrado e ativo)
   * e com permissão de acesso ao sistema.
   * Fail-closed: por segurança, se a validação estiver habilitada mas não for
   * possível consultar o banco, o acesso é bloqueado.
   */
  async isAuthorized(phone: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('[USER_ACCESS] Controle de acesso desabilitado (USER_ACCESS_ENABLED=false). Permitindo todos.');
      return true;
    }

    if (!this.pool) {
      this.logger.error(
        '[USER_ACCESS] Controle de acesso habilitado, mas GASTOS_DATABASE_URL não está configurada. Bloqueando acesso por segurança.',
      );
      return false;
    }

    const normalized = this.normalizePhone(phone);
    if (!normalized) return false;

    try {
      const result = await this.pool.query(
        `SELECT id, nome, telefone, perfil, ativo,
                pode_ver_gastos, pode_editar_gastos, pode_excluir_gastos, pode_gerenciar_usuarios
         FROM usuarios
         WHERE telefone = $1
         LIMIT 1`,
        [normalized],
      );

      const user = result.rows[0] as AuthorizedUser | undefined;
      if (!user) {
        this.logger.warn(`[USER_ACCESS] Telefone ${normalized} não cadastrado. Acesso bloqueado.`);
        return false;
      }

      if (!user.ativo) {
        this.logger.warn(`[USER_ACCESS] Usuário ${normalized} está inativo. Acesso bloqueado.`);
        return false;
      }

      // Usuário precisa ter ao menos a permissão de ver gastos para navegar pelo menu.
      if (!user.pode_ver_gastos && user.perfil.toUpperCase() !== 'ADMIN') {
        this.logger.warn(`[USER_ACCESS] Usuário ${normalized} sem permissão de acesso. Acesso bloqueado.`);
        return false;
      }

      this.logger.log(`[USER_ACCESS] Usuário ${normalized} autorizado (perfil: ${user.perfil}).`);
      return true;
    } catch (err) {
      this.logger.error(`[USER_ACCESS] Falha ao verificar autorização para ${normalized}: ${err}`);
      // Em caso de falha de conexão, bloqueia por segurança (fail-closed).
      return false;
    }
  }

  private normalizePhone(phone: string): string | null {
    let digits = phone.replace(/\D/g, '');
    if (!digits) return null;

    // Normaliza para o formato do banco: DDI 55 + DDD + número (ex: 5511953869941).
    // Remove o sufixo de dispositivo/JID já tratado no adapter.
    // Remove o "9" excedente do DDI quando o número já veio completo.
    if (digits.startsWith('55')) {
      // Já tem DDI. Mantém como está (55 + número completo).
      return digits;
    }

    // Sem DDI. Adiciona 55.
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }

    return digits;
  }
}
