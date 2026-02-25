// src/transaction/dto/create-transaction.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsDateString, ValidateIf, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, SplitType } from '@prisma/client';

class SplitItemDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsNumber()
  percentage?: number;   // usado no PERCENTAGE

  @IsOptional()
  @IsNumber()
  amount?: number;       // usado no MANUAL
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isPersonal?: boolean;

  // ==================== CAMPOS NOVOS PARA RATEIO FAMILIAR ====================
  @IsString()
  @IsOptional()
  familyId?: string;

  @IsEnum(SplitType)
  @ValidateIf(o => o.familyId)           // obrigatório só se for familiar
  @IsNotEmpty()
  splitType?: SplitType;

  @IsArray()
  @ValidateIf(o => o.familyId && (o.splitType === 'PERCENTAGE' || o.splitType === 'MANUAL'))
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  splits?: SplitItemDto[];
}