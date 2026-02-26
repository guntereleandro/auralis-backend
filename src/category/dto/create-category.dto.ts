import { IsEnum, IsNotEmpty, IsString, IsOptional, IsHexColor } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  familyId?: string;

  // === OFFLINE SUPPORT ===
  @IsString()
  @IsOptional()
  localId?: string;
}