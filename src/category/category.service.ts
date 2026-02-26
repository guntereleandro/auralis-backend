// src/category/category.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    // Proteção contra duplicata offline
    if (dto.localId) {
      const existing = await this.prisma.category.findUnique({
        where: { localId: dto.localId },
      });
      if (existing) return existing;
    }

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

    if (existing) throw new ConflictException('Categoria com este nome já existe');

    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color,
        icon: dto.icon,
        userId: dto.familyId ? null : userId,
        familyId: dto.familyId,
        localId: dto.localId,
        createdLocally: !!dto.localId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { userId },
          { family: { members: { some: { userId } } } },
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