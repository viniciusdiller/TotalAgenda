import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Role } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { hashPasswordSetToken } from "../common/utils/password-set-token.util";
import { LOCKOUT_THRESHOLD, lockoutDurationMs } from "../common/utils/lockout.util";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { JwtPayload, RefreshTokenPayload } from "./types/auth-user";

const REFRESH_TOKEN_EXPIRES_IN = "30d";

const BCRYPT_ROUNDS = 12;

// Hash fixo (calculado uma vez, no boot) só pra rodar bcrypt.compare contra ele quando não
// há usuário/está bloqueado — mesmo custo de CPU de uma comparação real, senão o tempo de
// resposta denuncia se o e-mail existe ou se a conta está travada (CLAUDE.md: "o tempo de
// resposta não pode denunciar o que a mensagem esconde").
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-attack-mitigation", BCRYPT_ROUNDS);


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
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    // Conta travada por tentativas seguidas erradas: nem compara a senha enviada — a
    // resposta (mensagem, status, tempo) tem que ser idêntica ao caso "senha errada", senão
    // dá pra inferir que a conta existe e está bloqueada só pelo comportamento da API.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.registerFailedLogin(user.id);
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
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

  private async registerFailedLogin(userId: string) {
    // Incremento atômico no banco — nunca "lê failedLoginAttempts, soma 1 em memória,
    // escreve de volta". Esse segundo padrão tem uma janela de corrida: N tentativas
    // concorrentes (trivial de disparar, inclusive de IPs diferentes) leem o mesmo valor
    // antes de qualquer escrita confirmar, então o contador só avança +1 no total por
    // rodada em vez de +N — o lockout nunca dispara sob força bruta paralela. O UPDATE com
    // `increment` serializa via lock de linha do Postgres, então cada tentativa concorrente
    // soma corretamente.
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (updated.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + lockoutDurationMs(updated.failedLoginAttempts)) },
      });
    }
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

    // Usuário desativado não resgata convite: setPassword devolve tokens de sessão, então isso
    // seria uma porta de volta pra uma conta que o dono já desligou.
    if (
      !user ||
      !user.isActive ||
      !user.passwordSetTokenExpiresAt ||
      user.passwordSetTokenExpiresAt < new Date()
    ) {
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
