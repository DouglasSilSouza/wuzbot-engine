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
    this.enabled = process.env.USER_ACCESS_ENABLED !== 'false' && Boolean(dbUrl);
    if (dbUrl) {
      this.pool = new Pool({ connectionString: dbUrl });
    } else {
      this.pool = null;
    }
  }

  /**
   * Verifica se o telefone pertence a um usuário autorizado (cadastrado e ativo)
   * e com permissão de acesso ao sistema.
   */
  async isAuthorized(phone: string): Promise<boolean> {
    if (!this.enabled || !this.pool) {
      // Se a validação de acesso não estiver configurada, não bloqueia ninguém.
      this.logger.warn('[USER_ACCESS] Validação de acesso desabilitada (sem GASTOS_DATABASE_URL). Permitindo acesso.');
      return true;
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
    if (digits.length === 12 && digits.startsWith('55')) {
      return digits;
    }
    if (digits.length === 10) {
      // Sem DDI (ex: 11953869941 -> 5511953869941)
      return `55${digits}`;
    }
    if (digits.length === 11) {
      return digits;
    }
    return digits || null;
  }
}
