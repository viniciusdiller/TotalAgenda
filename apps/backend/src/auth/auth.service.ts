import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Role } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./types/auth-user";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { professional: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    return this.buildAuthResponse(
      user.id,
      user.tenantId,
      user.role,
      user.email,
      user.name,
      user.professional?.id,
    );
  }

  private buildAuthResponse(
    userId: string,
    tenantId: string,
    role: Role,
    email: string,
    name: string,
    professionalId?: string,
  ) {
    const payload: JwtPayload = { sub: userId, tenantId, role, professionalId };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: userId, tenantId, role, email, name, professionalId },
    };
  }
}
