import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsDateString, ValidateIf, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, SplitType } from '@prisma/client';

class SplitItemDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;
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
  categoryId?: string;   // ← MUDADO: agora é categoryId (relação)

  @IsBoolean()
  @IsOptional()
  isPersonal?: boolean = true;

  @IsString()
  @IsOptional()
  familyId?: string;

  @IsEnum(SplitType)
  @ValidateIf(o => !!o.familyId)
  @IsNotEmpty()
  splitType?: SplitType;

  @IsArray()
  @ValidateIf(o => !!o.familyId && (o.splitType === 'PERCENTAGE' || o.splitType === 'MANUAL'))
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  splits?: SplitItemDto[];
}