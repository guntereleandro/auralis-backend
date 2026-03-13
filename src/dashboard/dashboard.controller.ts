// src/dashboard/dashboard.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PersonalDashboardDto } from './dto/personal-dashboard.dto';
import { FamilyDashboardDto } from './dto/family-dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('personal')
  async getPersonal(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<PersonalDashboardDto> {
    return this.dashboardService.getPersonalDashboard(
      req.user.id,
      month ? +month : undefined,
      year ? +year : undefined,
    );
  }

  // ✅ Agora exige familyId como query param obrigatório
  @Get('family')
  async getFamily(
    @Req() req: any,
    @Query('familyId') familyId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<FamilyDashboardDto> {
    if (!familyId) {
      throw new BadRequestException('familyId é obrigatório');
    }

    return this.dashboardService.getFamilyDashboard(
      req.user.id,
      familyId,
      month ? +month : undefined,
      year ? +year : undefined,
    );
  }
}