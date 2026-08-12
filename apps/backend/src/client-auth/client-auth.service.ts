import { Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { ClientsService } from "../clients/clients.service";
import { ClientLoginDto } from "./dto/client-login.dto";
import { AuthenticatedClient, ClientJwtPayload } from "./types/client-auth-user";

const CLIENT_TOKEN_EXPIRES_IN = "180d";

@Injectable()
export class ClientAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly jwtService: JwtService,
  ) {}

  // v1 não tem OTP/verificação: ter o telefone já é suficiente para abrir sessão do Client
  // correspondente — trade-off de produto aceito conscientemente para sair rápido (ver
  // plano). O ponto de extensão para verificação real é aqui: trocar a busca direta por
  // "gera OTP → verifica OTP → busca/loga", sem tocar no guard, no formato do token, nem em
  // nada que consome AuthenticatedClient.
  async login(slug: string, dto: ClientLoginDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    const client = await this.clientsService.findByTenantAndPhone(tenant.id, dto.phone);
    if (!client) {
      throw new NotFoundException(
        "Nenhum cadastro encontrado com esse telefone. Faça seu primeiro agendamento.",
      );
    }

    const payload: ClientJwtPayload = { sub: client.id, tenantId: tenant.id, type: "client" };
    const accessToken = this.jwtService.sign(payload, { expiresIn: CLIENT_TOKEN_EXPIRES_IN });

    return {
      accessToken,
      client: { id: client.id, name: client.name, phone: client.phone },
    };
  }

  async me(authClient: AuthenticatedClient) {
    const client = await this.prisma.client.findUniqueOrThrow({
      where: { id: authClient.clientId },
      select: { id: true, name: true, phone: true },
    });
    return client;
  }
}
