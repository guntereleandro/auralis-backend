// src/category/category.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('familyId') familyId?: string) {
    if (familyId) {
      return this.categoryService.findByFamily(familyId);
    }
    return this.categoryService.findAll(req.user.id);
  }
}