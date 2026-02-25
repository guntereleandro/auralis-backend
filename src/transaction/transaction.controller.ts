// src/transaction/transaction.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
  Query,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Req() req: any, @Body() createDto: CreateTransactionDto) {
    return this.transactionService.create(req.user.id, createDto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('type') type?: 'personal' | 'family',
  ) {
    return this.transactionService.findAll(req.user.id, type);
  }

  @Get('summary')
  getSummary(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('type') type?: 'personal' | 'family',
  ) {
    return this.transactionService.getMonthlySummary(
      req.user.id,
      month ? +month : undefined,
      year ? +year : undefined,
      type,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.transactionService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  update(@Req() req: any, @Param('id') id: string, @Body() updateDto: UpdateTransactionDto) {
    return this.transactionService.update(req.user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.transactionService.remove(req.user.id, id);
  }
}