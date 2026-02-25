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
import { SplitType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  // ====================== CREATE PRINCIPAL ======================
  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.familyId && dto.splitType) {
      return this.createFamilyTransaction(userId, dto);
    }

    // Transação pessoal simples
    return this.prisma.transaction.create({
      data: {
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        category: dto.category,
        isPersonal: true,
        userId,
      },
    });
  }

  // ====================== RATEIO FAMILIAR FLEXÍVEL ======================
  private async createFamilyTransaction(payerId: string, dto: CreateTransactionDto) {
    if (!dto.familyId || !dto.splitType) {
      throw new BadRequestException('familyId e splitType são obrigatórios para transações familiares');
    }

    const isMember = await this.prisma.familyMember.findFirst({
      where: { familyId: dto.familyId, userId: payerId },
    });
    if (!isMember) throw new ForbiddenException('Você não pertence a esta família');

    const transaction = await this.prisma.transaction.create({
      data: {
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        category: dto.category,
        isPersonal: false,
        userId: payerId,
        familyId: dto.familyId,
        splitType: dto.splitType,
      },
    });

    let splitsData: any[] = [];

    const members = await this.prisma.familyMember.findMany({
      where: { familyId: dto.familyId },
    });

    if (dto.splitType === 'SINGLE') {
      splitsData = [{
        transactionId: transaction.id,
        userId: payerId,
        amount: dto.amount,
        percentage: 100,
      }];
    } else if (dto.splitType === 'EQUAL') {
      const share = Number(dto.amount) / members.length;
      splitsData = members.map(m => ({
        transactionId: transaction.id,
        userId: m.userId,
        amount: share,
        percentage: Number((100 / members.length).toFixed(2)),
      }));
    } else if (dto.splitType === 'PERCENTAGE') {
      const totalPercent = dto.splits!.reduce((sum, s) => sum + (s.percentage || 0), 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new BadRequestException('A soma das porcentagens deve ser exatamente 100%');
      }
      splitsData = dto.splits!.map(s => ({
        transactionId: transaction.id,
        userId: s.userId,
        amount: Number((dto.amount * (s.percentage! / 100)).toFixed(2)),
        percentage: s.percentage!,
      }));
    } else if (dto.splitType === 'MANUAL') {
      const totalManual = dto.splits!.reduce((sum, s) => sum + (s.amount || 0), 0);
      if (Math.abs(totalManual - dto.amount) > 0.01) {
        throw new BadRequestException('A soma dos valores manuais deve ser igual ao total da transação');
      }
      splitsData = dto.splits!.map(s => ({
        transactionId: transaction.id,
        userId: s.userId,
        amount: s.amount!,
        percentage: Number(((s.amount! / dto.amount) * 100).toFixed(2)),
      }));
    }

    if (splitsData.length > 0) {
      await this.prisma.split.createMany({ data: splitsData });
    }

    return this.prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: { 
        splits: { 
          include: { user: { select: { id: true, fullName: true, displayName: true } } } 
        } 
      },
    });
  }

  // ====================== MÉTODOS ANTIGOS (restaurados) ======================
  async findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: { splits: { include: { user: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { splits: { include: { user: true } } },
    });
    if (!transaction) throw new NotFoundException('Transação não encontrada');
    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: { splits: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.transaction.delete({ where: { id } });
  }

  async getMonthlySummary(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    });

    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
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