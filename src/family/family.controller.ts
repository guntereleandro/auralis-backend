// src/family/family.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  // POST /families
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Req() req: any, @Body() dto: CreateFamilyDto) {
    return this.familyService.create(req.user.id, dto);
  }

  // GET /families
  @Get()
  findMyFamilies(@Req() req: any) {
    return this.familyService.findMyFamilies(req.user.id);
  }

  // GET /families/:familyId
  @Get(':familyId')
  findOne(@Req() req: any, @Param('familyId') familyId: string) {
    return this.familyService.findOne(req.user.id, familyId);
  }

  // POST /families/:familyId/members
  @Post(':familyId/members')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addMember(
    @Req() req: any,
    @Param('familyId') familyId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.familyService.addMember(req.user.id, familyId, dto);
  }

  // DELETE /families/:familyId/members/:memberId
  @Delete(':familyId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Req() req: any,
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.familyService.removeMember(req.user.id, familyId, memberId);
  }

  // DELETE /families/:familyId
  @Delete(':familyId')
  @HttpCode(HttpStatus.OK)
  deleteFamily(@Req() req: any, @Param('familyId') familyId: string) {
    return this.familyService.deleteFamily(req.user.id, familyId);
  }
}