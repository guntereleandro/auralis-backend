// src/family/family.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  // ====================== CREATE ======================
  async create(ownerId: string, dto: CreateFamilyDto) {
    return this.prisma.family.create({
      data: {
        name: dto.name,
        ownerId,
        members: {
          create: { userId: ownerId, role: 'OWNER' },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, displayName: true, email: true },
            },
          },
        },
      },
    });
  }

  // ====================== FIND ALL ======================
  async findMyFamilies(userId: string) {
    return this.prisma.family.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, displayName: true, email: true },
            },
          },
        },
      },
    });
  }

  // ====================== FIND ONE ======================
  async findOne(userId: string, familyId: string) {
    const family = await this.prisma.family.findFirst({
      where: {
        id: familyId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, displayName: true, email: true },
            },
          },
        },
      },
    });

    if (!family) throw new NotFoundException('Família não encontrada ou você não tem acesso');
    return family;
  }

  // ====================== ADD MEMBER ======================
  async addMember(ownerId: string, familyId: string, dto: AddMemberDto) {
    // Apenas o owner pode adicionar membros
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, ownerId },
    });
    if (!family) throw new NotFoundException('Família não encontrada ou você não é o dono');

    const userToAdd = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!userToAdd) throw new NotFoundException('Usuário não encontrado');

    // Owner não pode adicionar a si mesmo
    if (userToAdd.id === ownerId) {
      throw new BadRequestException('Você já é membro desta família como owner');
    }

    const alreadyMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: userToAdd.id } },
    });
    if (alreadyMember) throw new ConflictException('Usuário já é membro desta família');

    return this.prisma.familyMember.create({
      data: { familyId, userId: userToAdd.id, role: 'MEMBER' },
      include: {
        user: {
          select: { id: true, fullName: true, displayName: true, email: true },
        },
      },
    });
  }

  // ====================== REMOVE MEMBER ======================
  async removeMember(ownerId: string, familyId: string, memberUserId: string) {
    // Apenas o owner pode remover membros
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, ownerId },
    });
    if (!family) throw new NotFoundException('Família não encontrada ou você não é o dono');

    // Owner não pode remover a si mesmo
    if (memberUserId === ownerId) {
      throw new BadRequestException(
        'O owner não pode ser removido. Delete a família ou transfira a ownership.',
      );
    }

    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: memberUserId } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado nesta família');

    await this.prisma.familyMember.delete({
      where: { familyId_userId: { familyId, userId: memberUserId } },
    });

    return { message: 'Membro removido com sucesso' };
  }

  // ====================== DELETE FAMILY ======================
  async deleteFamily(ownerId: string, familyId: string) {
    // Apenas o owner pode deletar a família
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, ownerId },
    });
    if (!family) throw new NotFoundException('Família não encontrada ou você não é o dono');

    // ✅ $transaction garante que tudo é deletado atomicamente
    // Deleta splits → transações → membros → família
    await this.prisma.$transaction(async (tx) => {
      // 1. Deletar splits das transações da família
      const familyTransactions = await tx.transaction.findMany({
        where: { familyId },
        select: { id: true },
      });
      const transactionIds = familyTransactions.map((t) => t.id);

      if (transactionIds.length > 0) {
        await tx.split.deleteMany({
          where: { transactionId: { in: transactionIds } },
        });
      }

      // 2. Deletar transações da família
      await tx.transaction.deleteMany({ where: { familyId } });

      // 3. Deletar categorias da família
      await tx.category.deleteMany({ where: { familyId } });

      // 4. Deletar membros da família
      await tx.familyMember.deleteMany({ where: { familyId } });

      // 5. Deletar a família
      await tx.family.delete({ where: { id: familyId } });
    });

    return { message: 'Família deletada com sucesso' };
  }
}