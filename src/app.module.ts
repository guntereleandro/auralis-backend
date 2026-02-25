// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { FamilyModule } from './family/family.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TransactionModule,
    FamilyModule,
  ],
})
export class AppModule {}