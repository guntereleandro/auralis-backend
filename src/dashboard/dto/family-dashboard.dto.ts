// src/dashboard/dto/family-dashboard.dto.ts
export class FamilyDashboardDto {
    familyId: string;
    familyName: string;
    month: number;
    year: number;
    totalIncome: number;
    totalExpense: number;
    balance: number;
  
    membersBalance: Array<{
      userId: string;
      name: string;
      paid: number;
      shouldPay: number;
      balance: number;
    }>;
  
    // NOVO: Gráfico de evolução dos últimos 6 meses
    monthlyTrend: Array<{
      month: number;
      year: number;
      income: number;
      expense: number;
      balance: number;
    }>;
  
    // NOVO: Top categorias do mês atual (da família)
    topCategories: Array<{
      category: string;
      total: number;
      percentage: number;
    }>;
  }