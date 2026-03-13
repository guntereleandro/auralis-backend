// src/dashboard/dashboard.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersonalDashboardDto } from './dto/personal-dashboard.dto';
import { FamilyDashboardDto } from './dto/family-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ====================== DASHBOARD PESSOAL ======================
  async getPersonalDashboard(
    userId: string,
    month?: number,
    year?: number,
  ): Promise<PersonalDashboardDto> {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        isPersonal: true,
        date: { gte: startDate, lte: endDate },
      },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // ✅ getMonthlyTrend agora usa 1 query só
    const monthlyTrend = await this.getMonthlyTrend(userId, true);
    const topCategories = await this.getTopCategories(userId, true, targetMonth, targetYear);

    return {
      month: targetMonth,
      year: targetYear,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      balance: Number((totalIncome - totalExpense).toFixed(2)),
      transactionCount: transactions.length,
      monthlyTrend,
      topCategories,
    };
  }

  // ====================== DASHBOARD FAMILIAR ======================
  // ✅ Agora aceita familyId como parâmetro — não pega mais sempre a primeira família
  async getFamilyDashboard(
    userId: string,
    familyId: string,
    month?: number,
    year?: number,
  ): Promise<FamilyDashboardDto> {
    // Verificar se o usuário é membro da família informada
    const familyMember = await this.prisma.familyMember.findFirst({
      where: { userId, familyId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, fullName: true, displayName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!familyMember?.family) {
      throw new NotFoundException('Família não encontrada ou você não é membro');
    }

    const family = familyMember.family;

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        familyId: family.id,
        isPersonal: false,
        date: { gte: startDate, lte: endDate },
      },
      include: { splits: true },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Balanço por membro
    const membersBalance = family.members.map((member) => {
      const paid = transactions
        .filter((t) => t.userId === member.userId && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const shouldPay = transactions
        .flatMap((t) => t.splits)
        .filter((s) => s.userId === member.userId)
        .reduce((sum, s) => sum + Number(s.amount), 0);

      return {
        userId: member.userId,
        name: member.user.displayName || member.user.fullName,
        paid: Number(paid.toFixed(2)),
        shouldPay: Number(shouldPay.toFixed(2)),
        // ✅ positivo = pagou mais do que devia (credor)
        // ✅ negativo = pagou menos do que devia (devedor)
        balance: Number((paid - shouldPay).toFixed(2)),
      };
    });

    // ✅ getMonthlyTrend agora usa 1 query só
    const monthlyTrend = await this.getMonthlyTrend(family.id, false);
    const topCategories = await this.getTopCategories(
      family.id,
      false,
      targetMonth,
      targetYear,
    );

    return {
      familyId: family.id,
      familyName: family.name,
      month: targetMonth,
      year: targetYear,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      balance: Number((totalIncome - totalExpense).toFixed(2)),
      membersBalance,
      monthlyTrend,
      topCategories,
    };
  }

  // ====================== MONTHLY TREND (otimizado — 1 query) ======================
  private async getMonthlyTrend(id: string, isPersonal: boolean) {
    const now = new Date();

    // ✅ Calcula range dos últimos 6 meses de uma vez
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // ✅ 1 única query para buscar tudo
    const transactions = await this.prisma.transaction.findMany({
      where: isPersonal
        ? { userId: id, isPersonal: true, date: { gte: startDate, lte: endDate } }
        : { familyId: id, isPersonal: false, date: { gte: startDate, lte: endDate } },
      select: { type: true, amount: true, date: true },
    });

    // Agrupar em memória por mês/ano
    const trend: Array<{
      month: number;
      year: number;
      income: number;
      expense: number;
      balance: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = date.getMonth();
      const y = date.getFullYear();

      // Filtrar transações do mês em memória
      const monthTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y;
      });

      const income = monthTxs
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = monthTxs
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      trend.push({
        month: m + 1,
        year: y,
        income: Number(income.toFixed(2)),
        expense: Number(expense.toFixed(2)),
        balance: Number((income - expense).toFixed(2)),
      });
    }

    return trend;
  }

  // ====================== TOP CATEGORIES ======================
  private async getTopCategories(
    id: string,
    isPersonal: boolean,
    month: number,
    year: number,
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: isPersonal
        ? { userId: id, isPersonal: true, date: { gte: startDate, lte: endDate } }
        : { familyId: id, isPersonal: false, date: { gte: startDate, lte: endDate } },
      include: { category: true },
    });

    const categoryMap = new Map<string, number>();

    transactions.forEach((t) => {
      const categoryName = t.category?.name || 'Sem categoria';
      const current = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, current + Number(t.amount));
    });

    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(categoryMap.entries())
      .map(([category, totalAmount]) => ({
        category,
        total: Number(totalAmount.toFixed(2)),
        percentage:
          total > 0 ? Number(((totalAmount / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }
}