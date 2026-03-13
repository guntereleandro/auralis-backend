// src/category/dto/update-category.dto.ts
import {
    IsEnum,
    IsHexColor,
    IsOptional,
    IsString,
  } from 'class-validator';
  import { TransactionType } from '@prisma/client';
  
  export class UpdateCategoryDto {
    @IsString()
    @IsOptional()
    name?: string;
  
    @IsEnum(TransactionType)
    @IsOptional()
    type?: TransactionType;
  
    @IsHexColor()
    @IsOptional()
    color?: string;
  
    @IsString()
    @IsOptional()
    icon?: string;
  }