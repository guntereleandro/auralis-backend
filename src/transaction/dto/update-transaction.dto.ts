// src/transaction/dto/update-transaction.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { TransactionType } from '@prisma/client';

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
  categoryId?: string;     // ← MUDADO: agora é categoryId

  @IsBoolean()
  @IsOptional()
  isPersonal?: boolean;
}