// src/family/family.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

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
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });
  }

  async addMember(ownerId: string, familyId: string, dto: AddMemberDto) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, ownerId },
    });
    if (!family) throw new NotFoundException('Família não encontrada ou você não é o dono');

    const userToAdd = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!userToAdd) throw new NotFoundException('Usuário não encontrado');

    const alreadyMember = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: userToAdd.id } },
    });
    if (alreadyMember) throw new ConflictException('Usuário já é membro desta família');

    return this.prisma.familyMember.create({
      data: { familyId, userId: userToAdd.id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

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
          include: { user: { select: { id: true, fullName: true, displayName: true, email: true } } },
        },
      },
    });
  }
}