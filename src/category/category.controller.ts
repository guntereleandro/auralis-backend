// src/category/category.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // POST /categories
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(req.user.id, dto);
  }

  // GET /categories ou GET /categories?familyId=xxx
  @Get()
  findAll(@Req() req: any, @Query('familyId') familyId?: string) {
    if (familyId) {
      return this.categoryService.findByFamily(familyId);
    }
    return this.categoryService.findAll(req.user.id);
  }

  // GET /categories/:id
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.categoryService.findOne(req.user.id, id);
  }

  // PATCH /categories/:id
  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(req.user.id, id, dto);
  }

  // DELETE /categories/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.categoryService.remove(req.user.id, id);
  }
}