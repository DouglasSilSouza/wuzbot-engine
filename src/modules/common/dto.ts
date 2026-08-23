import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CanonicalInputType, CanonicalOutputType } from '../translation/canonical.types';
export class CanonicalInputDto { @IsString() phone!: string; @IsString() externalMessageId!: string; @IsEnum(CanonicalInputType) type!: CanonicalInputType; @IsOptional() @IsString() text?: string; }
export class CanonicalOutputDto { @IsEnum(CanonicalOutputType) type!: CanonicalOutputType; @IsOptional() @IsString() text?: string; }
