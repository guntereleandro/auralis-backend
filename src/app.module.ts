// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { FamilyModule } from './family/family.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TransactionModule,
    FamilyModule,
    DashboardModule,
    CategoryModule,
  ],
})
export class AppModule {}