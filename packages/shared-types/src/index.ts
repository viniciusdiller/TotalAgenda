export interface PublicGalleryImage {
  id: string;
  url: string;
}

export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  businessHours: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  showServices: boolean;
  showTeam: boolean;
  showGallery: boolean;
  showContact: boolean;
  galleryImages: PublicGalleryImage[];
}

export interface UpdateTenantProfileInput {
  description?: string;
  address?: string;
  businessHours?: string;
  accentColor?: string;
  whatsappNumber?: string;
  instagramUrl?: string;
  showServices?: boolean;
  showTeam?: boolean;
  showGallery?: boolean;
  showContact?: boolean;
}

export interface PublicClient {
  id: string;
  name: string;
  phone: string;
}

export interface ClientLoginResponse {
  accessToken: string;
  client: PublicClient;
}

export interface MyBookingsResponse {
  client: PublicClient;
  bookings: PublicBooking[];
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
  tenant?: { slug: string };
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
