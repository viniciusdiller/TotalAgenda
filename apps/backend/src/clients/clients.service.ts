import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { isPlausibleBrazilianPhone, normalizePhone } from "../common/utils/phone.util";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // Aceita tanto o PrismaService quanto um Prisma.TransactionClient para que quem chama
  // (bookings/waitlist) possa fazer o upsert dentro da mesma transaction do agendamento.
  async upsertForBooking(
    tx: Prisma.TransactionClient | PrismaService,
    tenantId: string,
    name: string,
    rawPhone: string,
  ) {
    const phone = normalizePhone(rawPhone);
    if (!isPlausibleBrazilianPhone(phone)) {
      throw new BadRequestException("Telefone inválido.");
    }

    return tx.client.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: { name: name.trim() },
      create: { tenantId, phone, name: name.trim() },
    });
  }

  findByTenantAndPhone(tenantId: string, rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    return this.prisma.client.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });
  }
}
