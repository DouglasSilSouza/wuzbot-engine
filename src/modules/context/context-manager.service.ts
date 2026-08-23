import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WuzbotContextEntity } from './context.entity';
import { UpdateContextDto } from './context.interface';

@Injectable()
export class ContextManagerService {
  private readonly logger = new Logger(ContextManagerService.name);

  constructor(
    @InjectRepository(WuzbotContextEntity)
    private readonly repository: Repository<WuzbotContextEntity>,
  ) {}

  /**
   * Retrieves the persistent context for a phone number.
   */
  async getByPhone(phone: string): Promise<WuzbotContextEntity | null> {
    if (!phone) return null;
    return this.repository.findOne({ where: { phone } });
  }

  /**
   * Gets existing context or creates a new initialized context record.
   */
  async getOrCreate(phone: string): Promise<WuzbotContextEntity> {
    const existing = await this.getByPhone(phone);
    if (existing) return existing;

    this.logger.log(`[ContextManager] Creating new context for phone ${phone}`);
    const newContext = this.repository.create({
      phone,
      currentState: 'IDLE',
      lastIntent: null,
      lastTypebotGroup: null,
      waitingFor: null,
      lastBank: null,
      lastMonth: null,
      sessionStatus: 'ACTIVE',
      contextData: {},
    });

    return this.repository.save(newContext);
  }

  /**
   * Updates partial fields in the context.
   */
  async updateContext(
    phone: string,
    updates: UpdateContextDto,
  ): Promise<WuzbotContextEntity> {
    let context = await this.getOrCreate(phone);

    if (updates.currentState !== undefined) context.currentState = updates.currentState;
    if (updates.lastIntent !== undefined) context.lastIntent = updates.lastIntent;
    if (updates.lastTypebotGroup !== undefined) context.lastTypebotGroup = updates.lastTypebotGroup;
    if (updates.waitingFor !== undefined) context.waitingFor = updates.waitingFor;
    if (updates.lastBank !== undefined) context.lastBank = updates.lastBank;
    if (updates.lastMonth !== undefined) context.lastMonth = updates.lastMonth;
    if (updates.sessionStatus !== undefined) context.sessionStatus = updates.sessionStatus;

    if (updates.contextData !== undefined) {
      context.contextData = {
        ...context.contextData,
        ...updates.contextData,
      };
    }

    context = await this.repository.save(context);
    this.logger.debug(
      `[ContextManager] Updated context for ${phone}: state=${context.currentState}, intent=${context.lastIntent}, bank=${context.lastBank}`,
    );
    return context;
  }

  /**
   * Hook to update the last detected intent.
   */
  async setLastIntent(phone: string, intent: string): Promise<WuzbotContextEntity> {
    return this.updateContext(phone, { lastIntent: intent });
  }

  /**
   * Hook to update the last referenced bank (Nubank, Itaú, Bradesco, etc.).
   */
  async setLastBank(phone: string, bank: string): Promise<WuzbotContextEntity> {
    return this.updateContext(phone, { lastBank: bank });
  }

  /**
   * Hook to update the last referenced month/period.
   */
  async setLastMonth(phone: string, month: string): Promise<WuzbotContextEntity> {
    return this.updateContext(phone, { lastMonth: month });
  }

  /**
   * Hook to update the current conversational state and what input the bot is waiting for.
   */
  async setCurrentState(
    phone: string,
    state: string,
    waitingFor?: string | null,
  ): Promise<WuzbotContextEntity> {
    return this.updateContext(phone, { currentState: state, waitingFor: waitingFor ?? null });
  }

  /**
   * Hook to update the active session status (ACTIVE, EXPIRED, PAUSED, etc.).
   */
  async setSessionStatus(phone: string, status: string): Promise<WuzbotContextEntity> {
    return this.updateContext(phone, { sessionStatus: status });
  }

  /**
   * Deeply merges additional arbitrary metadata into `contextData`.
   */
  async mergeContextData(
    phone: string,
    data: Record<string, unknown>,
  ): Promise<WuzbotContextEntity> {
    return this.updateContext(phone, { contextData: data });
  }

  /**
   * Resets the active context for a clean start while preserving short-term memories (like lastBank).
   */
  async resetContext(phone: string): Promise<WuzbotContextEntity> {
    const existing = await this.getByPhone(phone);
    if (!existing) return this.getOrCreate(phone);

    existing.currentState = 'IDLE';
    existing.lastIntent = null;
    existing.lastTypebotGroup = null;
    existing.waitingFor = null;
    existing.sessionStatus = 'ACTIVE';
    existing.contextData = {};

    return this.repository.save(existing);
  }

  /**
   * Deletes context record permanently.
   */
  async deleteContext(phone: string): Promise<boolean> {
    const result = await this.repository.delete({ phone });
    return (result.affected ?? 0) > 0;
  }
}
