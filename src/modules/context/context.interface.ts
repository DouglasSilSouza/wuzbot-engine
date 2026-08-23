export interface WuzbotContext {
  phone: string;
  currentState?: string | null;
  lastIntent?: string | null;
  lastTypebotGroup?: string | null;
  waitingFor?: string | null;
  lastBank?: string | null;
  lastMonth?: string | null;
  sessionStatus: string;
  contextData: Record<string, unknown>;
}

export interface UpdateContextDto {
  currentState?: string | null;
  lastIntent?: string | null;
  lastTypebotGroup?: string | null;
  waitingFor?: string | null;
  lastBank?: string | null;
  lastMonth?: string | null;
  sessionStatus?: string;
  contextData?: Record<string, unknown>;
}
