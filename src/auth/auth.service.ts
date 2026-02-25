// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { UserMeDto } from './dto/me.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        displayName: dto.displayName || dto.fullName.split(' ')[0],
        email: dto.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      message: 'Usuário cadastrado com sucesso!',
      user,
      accessToken: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    return {
      accessToken: this.jwtService.sign({ sub: user.id, email: user.email }),
      user: {
        id: user.id,
        fullName: user.fullName,
        displayName: user.displayName,
        email: user.email,
      },
    };
  }

  async getMe(userId: string): Promise<UserMeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    const familyMembers = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          select: { id: true, name: true },
        },
      },
    });

    const hasFamily = familyMembers.length > 0;
    const activeFamily = familyMembers[0]; // primeira família como ativa (pode melhorar depois)

    return {
      id: user.id,
      fullName: user.fullName,
      displayName: user.displayName,
      email: user.email,
      createdAt: user.createdAt,
      hasFamily,
      activeFamilyId: activeFamily?.family.id,
      activeFamilyName: activeFamily?.family.name,
      activeFamilyRole: activeFamily?.role,
      families: familyMembers.map((fm) => ({
        id: fm.family.id,
        name: fm.family.name,
        role: fm.role,
      })),
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, displayName: true },
    });
  }
}