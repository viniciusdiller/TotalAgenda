export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
}

export interface PublicProfessional {
  id: string;
  name: string;
  bio: string | null;
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
}

export interface CreateBookingInput {
  professionalId: string;
  serviceId: string;
  startAt: string;
  clientName: string;
  clientPhone: string;
}

export interface PublicBooking {
  id: string;
  professionalId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  startAt: string;
  endAt: string;
  priceCentsSnapshot: number;
  status: "CONFIRMED" | "CANCELED" | "COMPLETED";
  manageToken: string;
  rescheduledCount: number;
  service?: { name: string };
  professional?: { id: string; user: { name: string } };
}

export interface CreateWaitlistInput {
  serviceId: string;
  professionalId?: string;
  clientName: string;
  clientPhone: string;
  preferredDate?: string;
  notes?: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
