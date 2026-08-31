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
  updatedAt: string;
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

export type StaffRole = "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";

export type Weekday =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export interface CalendarProfessional {
  id: string;
  name: string;
  slotGranularityMinutes: number;
  workingHours: Array<{ weekday: Weekday; startMinute: number; endMinute: number }>;
}

export interface CalendarTimeBlock {
  id: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export interface CalendarResponse {
  professionals: CalendarProfessional[];
  appointments: PublicBooking[];
  timeBlocks: CalendarTimeBlock[];
}

export interface CreateStaffAppointmentInput {
  professionalId: string;
  startAt: string;
  items: Array<{ serviceId: string }>;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  notes?: string;
  status?: "SCHEDULED" | "CONFIRMED";
}

export interface AdminClientListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  createdAt: string;
  _count: { appointments: number };
}

export interface ClientIntakeResponse {
  id: string;
  formId: string;
  answers: Record<string, string | boolean>;
  updatedAt: string;
  form: { id: string; name: string; fields: IntakeFieldDef[] };
}

export interface IntakeFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "boolean" | "select";
  options?: string[];
  required?: boolean;
}

export interface AdminClientDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  cpf: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  appointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: AppointmentStatus;
    professional: { user: { name: string } };
    items: Array<{ id: string; service: { name: string }; priceCentsSnapshot: number }>;
  }>;
  intakeResponses: ClientIntakeResponse[];
}

export interface IntakeFormSummary {
  id: string;
  name: string;
  fields: IntakeFieldDef[];
  isActive: boolean;
}

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELED";

export interface AppointmentItem {
  id: string;
  serviceId: string;
  serviceName: string;
  position: number;
  durationMinutes: number;
  priceCentsSnapshot: number;
}

// Nome mantido (`PublicBooking`) por compatibilidade com o front atual. `priceCentsSnapshot`
// = soma dos itens; `service` = primeiro item (atalho legado). O agregado real são os `items`.
export interface PublicBooking {
  id: string;
  professionalId: string;
  // Atalho legado = serviço do primeiro item. Sempre presente (todo atendimento tem 1+ item).
  serviceId: string;
  clientName: string;
  clientPhone: string;
  startAt: string;
  endAt: string;
  priceCentsSnapshot: number;
  status: AppointmentStatus;
  source?: "PUBLIC" | "STAFF";
  notes?: string | null;
  manageToken: string;
  rescheduledCount: number;
  items?: AppointmentItem[];
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
