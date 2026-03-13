// src/transaction/dto/update-transaction.dto.ts
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, SplitType } from '@prisma/client';

class UpdateSplitItemDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class UpdateTransactionDto {
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  isPersonal?: boolean;

  @IsString()
  @IsOptional()
  localId?: string;

  // ✅ Agora aceita splitType para recalcular splits
  @IsEnum(SplitType)
  @IsOptional()
  splitType?: SplitType;

  // ✅ Obrigatório apenas quando splitType é PERCENTAGE ou MANUAL
  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.splitType === 'PERCENTAGE' || o.splitType === 'MANUAL')
  @ValidateNested({ each: true })
  @Type(() => UpdateSplitItemDto)
  splits?: UpdateSplitItemDto[];
}