// src/family/family.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Req() req: any, @Body() dto: CreateFamilyDto) {
    return this.familyService.create(req.user.id, dto);
  }

  @Post(':familyId/members')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addMember(
    @Req() req: any,
    @Param('familyId') familyId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.familyService.addMember(req.user.id, familyId, dto);
  }

  @Get()
  findMyFamilies(@Req() req: any) {
    return this.familyService.findMyFamilies(req.user.id);
  }
}