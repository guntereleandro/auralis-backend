// src/category/category.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // ====================== CREATE ======================
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

  // ====================== FIND ALL ======================
  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { userId },                                         // pessoais do usuário
          { family: { members: { some: { userId } } } },     // da família do usuário
          { isDefault: true, userId: null, familyId: null }, // ✅ globais padrão
        ],
      },
      orderBy: [
        { isDefault: 'desc' }, // padrões primeiro
        { name: 'asc' },
      ],
      include: { family: true },
    });
  }

  // ====================== FIND BY FAMILY ======================
  async findByFamily(familyId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { familyId },                                       // categorias da família
          { isDefault: true, userId: null, familyId: null }, // ✅ globais padrão
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  // ====================== FIND ONE ======================
  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { family: { members: { some: { userId } } } },
          { isDefault: true, userId: null, familyId: null }, // ✅ padrões também acessíveis
        ],
      },
      include: { family: true },
    });

    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  // ====================== UPDATE ======================
  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(userId, id);

    // ✅ Categorias padrão não podem ser editadas
    if (category.isDefault) {
      throw new ForbiddenException('Categorias padrão não podem ser editadas');
    }

    // Apenas o criador pode editar categoria pessoal
    if (category.userId && category.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para editar esta categoria');
    }

    // Verificar conflito de nome se o nome foi alterado
    if (dto.name && dto.name !== category.name) {
      const conflict = await this.prisma.category.findFirst({
        where: {
          id: { not: id },
          name: dto.name,
          type: dto.type ?? category.type,
          OR: [
            { userId: category.familyId ? null : userId },
            { familyId: category.familyId ?? undefined },
          ],
        },
      });
      if (conflict) throw new ConflictException('Já existe uma categoria com este nome');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color,
        icon: dto.icon,
      },
    });
  }

  // ====================== REMOVE ======================
  async remove(userId: string, id: string) {
    const category = await this.findOne(userId, id);

    // ✅ Categorias padrão não podem ser deletadas
    if (category.isDefault) {
      throw new ForbiddenException('Categorias padrão não podem ser deletadas');
    }

    // Apenas o criador pode deletar categoria pessoal
    if (category.userId && category.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para deletar esta categoria');
    }

    // Verificar se existem transações usando esta categoria
    const transactionsUsingCategory = await this.prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionsUsingCategory > 0) {
      throw new ConflictException(
        `Esta categoria possui ${transactionsUsingCategory} transação(ões) vinculada(s). Remova ou reclassifique-as antes de deletar.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Categoria deletada com sucesso' };
  }
}