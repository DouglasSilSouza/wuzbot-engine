import { IntentEnum } from '../enums/intent.enum';
import { SuggestedActionEnum } from '../enums/suggested-action.enum';
import { HumanBehaviorCategoryEnum } from '../enums/human-behavior-category.enum';
import { MediaClassificationEnum } from '../enums/media-classification.enum';

export interface IntentClassifyRequestDto {
  phone?: string;
  message?: string;
  text?: string;
  currentState?: string | null;
  waitingFor?: string | null;
  availableOptions?: string[];
  context?: Record<string, unknown>;
}

export interface IntentClassifyResponseDto {
  intent: IntentEnum;
  confidence: number;
  entities: Record<string, unknown>;
  suggestedAction: SuggestedActionEnum;
  targetFlow?: string | null;
  provider: string;
}

export interface RecoveryRequestDto {
  phone?: string;
  message?: string;
  text?: string;
  currentState?: string | null;
  waitingFor?: string | null;
  availableOptions?: string[];
  context?: Record<string, unknown>;
}

export interface RecoveryResponseDto {
  action: SuggestedActionEnum;
  message: string;
  matchedOption?: string | null;
  intent: string;
  confidence: number;
  provider: string;
}

export interface DetectHumanBehaviorDto {
  message?: string;
  text?: string;
}

export interface HumanBehaviorResponseDto {
  isHumanBehavior: boolean;
  category: HumanBehaviorCategoryEnum | null;
  suggestedMessage?: string | null;
}

export interface MediaClassifyRequestDto {
  phone?: string;
  mediaType: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
  url?: string;
}

export interface MediaClassifyResponseDto {
  classification: MediaClassificationEnum;
  confidence: number;
  suggestedAction: SuggestedActionEnum;
  provider: string;
}

export interface WuzMindContextDto {
  phone?: string;
  currentState?: string | null;
  lastIntent?: string | null;
  lastTypebotGroup?: string | null;
  waitingFor?: string | null;
  lastBank?: string | null;
  lastMonth?: string | null;
  lastFlow?: string | null;
  sessionStatus?: string;
  contextData?: Record<string, unknown>;
}
