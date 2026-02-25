// src/dashboard/dto/personal-dashboard.dto.ts
export class PersonalDashboardDto {
    month: number;
    year: number;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  
    // NOVO: Gráfico de evolução dos últimos 6 meses
    monthlyTrend: Array<{
      month: number;
      year: number;
      income: number;
      expense: number;
      balance: number;
    }>;
  
    // NOVO: Top categorias do mês atual
    topCategories: Array<{
      category: string;
      total: number;
      percentage: number;
    }>;
  }