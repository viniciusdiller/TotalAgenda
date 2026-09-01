import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Role } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { hashPasswordSetToken } from "../common/utils/password-set-token.util";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { JwtPayload, RefreshTokenPayload } from "./types/auth-user";

const REFRESH_TOKEN_EXPIRES_IN = "30d";

const BCRYPT_ROUNDS = 12;

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

  // O access token dura pouco (12h, ver JWT_EXPIRES_IN) de propósito — o refresh token
  // (30d) é quem sustenta a sessão longa. Sempre revalida o usuário no banco (role,
  // isActive, tenantId) em vez de confiar nas claims antigas do refresh token, seguindo a
  // mesma regra de nunca confiar em claim sem revalidar o recurso.
  async refresh(dto: RefreshDto) {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(dto.refreshToken);
    } catch {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { professional: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
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

  // Usado pela tela de "definir senha" antes de mostrar o formulário — confirma que o
  // convite ainda é válido sem gastar o token (que só é invalidado em setPassword).
  async checkSetPasswordToken(token: string) {
    const user = await this.findUserByValidSetPasswordToken(token);
    return { name: user.name, email: user.email };
  }

  async setPassword(dto: SetPasswordDto) {
    const user = await this.findUserByValidSetPasswordToken(dto.token);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordSetTokenHash: null, passwordSetTokenExpiresAt: null },
    });

    return this.buildAuthResponse(
      user.id,
      user.tenantId,
      user.role,
      user.email,
      user.name,
    );
  }

  private async findUserByValidSetPasswordToken(token: string) {
    const tokenHash = hashPasswordSetToken(token);
    const user = await this.prisma.user.findUnique({
      where: { passwordSetTokenHash: tokenHash },
    });

    if (!user || !user.passwordSetTokenExpiresAt || user.passwordSetTokenExpiresAt < new Date()) {
      throw new BadRequestException("Link de definição de senha inválido ou expirado.");
    }

    return user;
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

    const refreshPayload: RefreshTokenPayload = { sub: userId, type: "refresh" };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, tenantId, role, email, name, professionalId },
    };
  }
}
