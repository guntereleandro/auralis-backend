// src/transaction/transaction.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  // ====================== CREATE PRINCIPAL ======================
  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.localId) {
      const existing = await this.prisma.transaction.findUnique({
        where: { localId: dto.localId },
        include: { category: true, splits: true },
      });
      if (existing && existing.userId === userId) return existing;
    }

    if (dto.familyId && dto.splitType) {
      return this.createFamilyTransaction(userId, dto);
    }

    return this.prisma.transaction.create({
      data: {
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        categoryId: dto.categoryId,
        isPersonal: true,
        userId,
        localId: dto.localId,
        createdLocally: !!dto.localId,
      },
      include: { category: true, splits: true },
    });
  }

  // ====================== TRANSAÇÃO FAMILIAR ======================
  private async createFamilyTransaction(payerId: string, dto: CreateTransactionDto) {
    if (!dto.familyId || !dto.splitType) {
      throw new BadRequestException('familyId e splitType são obrigatórios');
    }

    if (dto.localId) {
      const existing = await this.prisma.transaction.findUnique({
        where: { localId: dto.localId },
        include: { category: true, splits: true },
      });
      if (existing && existing.userId === payerId) return existing;
    }

    const isMember = await this.prisma.familyMember.findFirst({
      where: { familyId: dto.familyId, userId: payerId },
    });
    if (!isMember) throw new ForbiddenException('Você não pertence a esta família');

    const members = await this.prisma.familyMember.findMany({
      where: { familyId: dto.familyId },
    });

    const splitsData = this.calculateSplits(
      payerId,
      dto.amount,
      dto.splitType,
      members.map((m) => m.userId),
      dto.splits,
    );

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          date: dto.date ? new Date(dto.date) : undefined,
          categoryId: dto.categoryId,
          isPersonal: false,
          userId: payerId,
          familyId: dto.familyId,
          splitType: dto.splitType,
          localId: dto.localId,
          createdLocally: !!dto.localId,
        },
      });

      if (splitsData.length > 0) {
        await tx.split.createMany({
          data: splitsData.map((s) => ({
            transactionId: transaction.id,
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
          })),
        });
      }

      return tx.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          category: true,
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });
  }

  // ====================== HELPER: CALCULAR SPLITS ======================
  // ✅ Extraído para método reutilizável — usado no create E no update
  private calculateSplits(
    payerId: string,
    amount: number,
    splitType: string,
    memberUserIds: string[],
    splits?: Array<{ userId: string; percentage?: number; amount?: number }>,
  ): Array<{ userId: string; amount: number; percentage: number }> {
    if (splitType === 'SINGLE') {
      return [{ userId: payerId, amount: Number(amount), percentage: 100 }];
    }

    if (splitType === 'EQUAL') {
      const share = Number(amount) / memberUserIds.length;
      const percentage = Number((100 / memberUserIds.length).toFixed(2));
      return memberUserIds.map((uid) => ({
        userId: uid,
        amount: Number(share.toFixed(2)),
        percentage,
      }));
    }

    if (splitType === 'PERCENTAGE') {
      if (!splits?.length) {
        throw new BadRequestException(
          'splits são obrigatórios para splitType PERCENTAGE',
        );
      }
      const totalPercent = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new BadRequestException('Soma das porcentagens deve ser 100%');
      }
      return splits.map((s) => ({
        userId: s.userId,
        amount: Number((amount * (s.percentage! / 100)).toFixed(2)),
        percentage: s.percentage!,
      }));
    }

    if (splitType === 'MANUAL') {
      if (!splits?.length) {
        throw new BadRequestException(
          'splits são obrigatórios para splitType MANUAL',
        );
      }
      const totalManual = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
      if (Math.abs(totalManual - amount) > 0.01) {
        throw new BadRequestException(
          'Soma dos valores deve ser igual ao total da transação',
        );
      }
      return splits.map((s) => ({
        userId: s.userId,
        amount: s.amount!,
        percentage: Number(((s.amount! / amount) * 100).toFixed(2)),
      }));
    }

    return [];
  }

  // ====================== FIND ALL ======================
  async findAll(userId: string, type?: 'personal' | 'family') {
    const familyMemberships = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });
    const familyIds = familyMemberships.map((fm) => fm.familyId);

    if (type === 'personal') {
      return this.prisma.transaction.findMany({
        where: { userId, isPersonal: true },
        orderBy: { date: 'desc' },
        include: {
          category: true,
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    }

    if (type === 'family') {
      return this.prisma.transaction.findMany({
        where: {
          isPersonal: false,
          familyId: { in: familyIds },
        },
        orderBy: { date: 'desc' },
        include: {
          category: true,
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    }

    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { userId, isPersonal: true },
          { isPersonal: false, familyId: { in: familyIds } },
        ],
      },
      orderBy: { date: 'desc' },
      include: {
        category: true,
        splits: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  // ====================== FIND ONE ======================
  async findOne(userId: string, id: string) {
    const familyMemberships = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });
    const familyIds = familyMemberships.map((fm) => fm.familyId);

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id,
        OR: [
          { userId, isPersonal: true },
          { isPersonal: false, familyId: { in: familyIds } },
        ],
      },
      include: {
        category: true,
        splits: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) throw new NotFoundException('Transação não encontrada');
    return transaction;
  }

  // ====================== UPDATE (com recálculo de splits) ======================
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(userId, id);

    // ✅ Se é transação familiar e houve mudança de valor ou splitType,
    // recalcula os splits dentro de um $transaction atômico
    if (!existing.isPersonal && existing.familyId) {
      const newAmount = dto.amount ?? Number(existing.amount);
      const newSplitType = dto.splitType ?? existing.splitType;

      // Buscar membros da família para recálculo
      const members = await this.prisma.familyMember.findMany({
        where: { familyId: existing.familyId },
      });

      const splitsData = this.calculateSplits(
        existing.userId,
        newAmount,
        newSplitType!,
        members.map((m) => m.userId),
        dto.splits,
      );

      return this.prisma.$transaction(async (tx) => {
        // Atualiza a transação
        await tx.transaction.update({
          where: { id },
          data: {
            type: dto.type,
            amount: dto.amount,
            description: dto.description,
            date: dto.date ? new Date(dto.date) : undefined,
            categoryId: dto.categoryId,
            splitType: dto.splitType,
          },
        });

        // ✅ Apaga splits antigos e recria com novos valores
        await tx.split.deleteMany({ where: { transactionId: id } });

        if (splitsData.length > 0) {
          await tx.split.createMany({
            data: splitsData.map((s) => ({
              transactionId: id,
              userId: s.userId,
              amount: s.amount,
              percentage: s.percentage,
            })),
          });
        }

        // Retorna transação completa e atualizada
        return tx.transaction.findUnique({
          where: { id },
          include: {
            category: true,
            splits: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    displayName: true,
                    email: true,
                  },
                },
              },
            },
          },
        });
      });
    }

    // Transação pessoal — update simples
    return this.prisma.transaction.update({
      where: { id },
      data: {
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        categoryId: dto.categoryId,
        isPersonal: dto.isPersonal,
        localId: dto.localId,
      },
      include: { category: true, splits: true },
    });
  }

  // ====================== REMOVE ======================
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.transaction.delete({ where: { id } });
  }

  // ====================== MONTHLY SUMMARY ======================
  async getMonthlySummary(
    userId: string,
    month?: number,
    year?: number,
    type?: 'personal' | 'family',
  ) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const familyMemberships = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });
    const familyIds = familyMemberships.map((fm) => fm.familyId);

    let where: any;

    if (type === 'personal') {
      where = { userId, isPersonal: true, date: { gte: startDate, lte: endDate } };
    } else if (type === 'family') {
      where = {
        isPersonal: false,
        familyId: { in: familyIds },
        date: { gte: startDate, lte: endDate },
      };
    } else {
      where = {
        OR: [
          { userId, isPersonal: true },
          { isPersonal: false, familyId: { in: familyIds } },
        ],
        date: { gte: startDate, lte: endDate },
      };
    }

    const transactions = await this.prisma.transaction.findMany({ where });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      month: targetMonth,
      year: targetYear,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      balance: Number((totalIncome - totalExpense).toFixed(2)),
      transactionCount: transactions.length,
    };
  }
}