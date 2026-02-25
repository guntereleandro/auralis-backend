// src/category/category.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    // Evita duplicata de nome + tipo
    const existing = await this.prisma.category.findFirst({
      where: {
        name: dto.name,
        type: dto.type,
        OR: [
          { userId: dto.familyId ? null : userId },
          { familyId: dto.familyId },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Já existe uma categoria com este nome e tipo');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color,
        icon: dto.icon,
        userId: dto.familyId ? null : userId,   // categoria pessoal
        familyId: dto.familyId,                 // categoria familiar
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { userId }, // categorias pessoais do usuário
          { family: { members: { some: { userId } } } }, // categorias da família
        ],
      },
      orderBy: { name: 'asc' },
      include: { family: true },
    });
  }

  async findByFamily(familyId: string) {
    return this.prisma.category.findMany({
      where: { familyId },
      orderBy: { name: 'asc' },
    });
  }
}