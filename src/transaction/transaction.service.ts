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

  // ====================== TRANSAÇÃO PESSOAL ======================
  async create(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        userId,
      },
      include: { splits: true },
    });
  }

  // ====================== TRANSAÇÃO FAMILIAR (COM RATEIO) ======================
  async createFamilyTransaction(userId: string, dto: CreateTransactionDto) {
    if (!dto.familyId) {
      throw new BadRequestException('familyId é obrigatório para transações familiares');
    }

    // Verifica se o usuário pertence à família
    const isMember = await this.prisma.familyMember.findFirst({
      where: { familyId: dto.familyId, userId },
    });
    if (!isMember) {
      throw new ForbiddenException('Você não pertence a esta família');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        isPersonal: false,
        userId, // quem pagou/criou
        familyId: dto.familyId,
      },
    });

    // Rateio igualitário automático
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: dto.familyId },
    });

    const shareAmount = Number(transaction.amount) / members.length;

    const splitsData = members.map((member) => ({
      transactionId: transaction.id,
      userId: member.userId,
      amount: shareAmount,
      percentage: Number((100 / members.length).toFixed(2)),
    }));

    await this.prisma.split.createMany({ data: splitsData });

    // Retorna a transação com os splits
    return this.prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: { splits: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: { splits: true },
    });
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { splits: true },
    });

    if (!transaction) throw new NotFoundException('Transação não encontrada');
    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id); // valida propriedade

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
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: { splits: true },
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
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }
}