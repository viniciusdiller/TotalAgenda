"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { DateTime } from "luxon";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type {
  AvailableSlot,
  PublicProfessional,
  PublicService,
} from "@totalagenda/shared-types";
import { publicApi, ApiError } from "@/lib/api";
import { StepIndicator } from "./StepIndicator";
import { ServiceStep } from "./ServiceStep";
import { ProfessionalStep } from "./ProfessionalStep";
import { DateTimeStep } from "./DateTimeStep";
import { ClientInfoStep } from "./ClientInfoStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { WaitlistForm } from "./WaitlistForm";
import { Button } from "../ui/Button";

const TIMEZONE = "America/Sao_Paulo";

type Step = 1 | 2 | 3 | 4;

export function BookingWizard({
  slug,
  tenantName,
  initialClient,
}: {
  slug: string;
  tenantName: string;
  // Presente quando o visitante já tem sessão de cliente (ver app/[slug]/agendar/page.tsx)
  // — pula a coleta manual de nome/telefone no último passo.
  initialClient?: { name: string; phone: string } | null;
}) {
  const [step, setStep] = useState<Step>(1);

  const [services, setServices] = useState<PublicService[] | null>(null);
  const [servicesError, setServicesError] = useState(false);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);

  const [professionals, setProfessionals] = useState<PublicProfessional[] | null>(null);
  const [professionalsError, setProfessionalsError] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<PublicProfessional | null>(
    null,
  );

  const [selectedDate, setSelectedDate] = useState(() =>
    DateTime.now().setZone(TIMEZONE).toISODate()!,
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  // Descarta respostas de disponibilidade que não são mais as mais recentes (ex.: usuário
  // troca de data rápido e a resposta da data anterior chega depois da mais nova).
  const slotsRequestRef = useRef(0);

  const [clientName, setClientName] = useState(initialClient?.name ?? "");
  const [clientPhone, setClientPhone] = useState(initialClient?.phone ?? "");
  const [formErrors, setFormErrors] = useState<{ clientName?: string; clientPhone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof publicApi.createBooking>> | null>(
    null,
  );

  const loadServices = useCallback(() => {
    setServices(null);
    setServicesError(false);
    publicApi
      .getServices(slug)
      .then(setServices)
      .catch(() => setServicesError(true));
  }, [slug]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const loadProfessionals = useCallback(
    (service: PublicService) => {
      setProfessionals(null);
      setProfessionalsError(false);
      publicApi
        .getProfessionals(slug, service.id)
        .then(setProfessionals)
        .catch(() => setProfessionalsError(true));
    },
    [slug],
  );

  // Busca disparada diretamente pelos handlers (não por useEffect chaveado em
  // selectedProfessional/selectedDate) — re-selecionar o mesmo profissional/dia não muda a
  // referência/valor, e um useEffect nessas dependências simplesmente não re-rodaria,
  // deixando o skeleton de horários travado pra sempre.
  const loadSlots = useCallback(
    (professional: PublicProfessional, service: PublicService, date: string) => {
      const requestId = ++slotsRequestRef.current;
      setIsLoadingSlots(true);
      setSlotsError(false);
      publicApi
        .getAvailability(slug, professional.id, service.id, date)
        .then((result) => {
          if (slotsRequestRef.current !== requestId) return;
          setSlots(result);
        })
        .catch(() => {
          if (slotsRequestRef.current !== requestId) return;
          setSlotsError(true);
        })
        .finally(() => {
          if (slotsRequestRef.current !== requestId) return;
          setIsLoadingSlots(false);
        });
    },
    [slug],
  );

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  function handleSelectService(service: PublicService) {
    setSelectedService(service);
    setSelectedProfessional(null);
    setStep(2);
    loadProfessionals(service);
  }

  function handleSelectProfessional(professional: PublicProfessional) {
    setSelectedProfessional(professional);
    setSelectedSlot(null);
    setShowWaitlist(false);
    setStep(3);
    if (selectedService) loadSlots(professional, selectedService, selectedDate);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowWaitlist(false);
    if (selectedProfessional && selectedService) {
      loadSlots(selectedProfessional, selectedService, date);
    }
  }

  async function handleJoinWaitlist(input: { clientName: string; clientPhone: string }) {
    if (!selectedService) return;
    await publicApi.joinWaitlist(slug, {
      serviceId: selectedService.id,
      professionalId: selectedProfessional?.id,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      preferredDate: selectedDate,
    });
  }

  async function handleConfirmBooking() {
    if (!initialClient) {
      const errors: typeof formErrors = {};
      if (clientName.trim().length < 2) errors.clientName = "Informe seu nome completo.";
      if (clientPhone.trim().length < 8) errors.clientPhone = "Informe um telefone válido.";
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    if (!selectedProfessional || !selectedService || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await publicApi.createBooking(slug, {
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        startAt: selectedSlot.startAt,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
      });
      setBooking(result);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Não foi possível confirmar o agendamento.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (booking) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <ConfirmationStep booking={booking} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-sm font-medium text-zinc-500 dark:text-stone-400">{tenantName}</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">
        Agendar horário
      </h1>

      <div className="mt-6">
        <StepIndicator currentStep={step} onStepClick={(s) => setStep(s as Step)} />
      </div>

      <div className="mt-8">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 ? (
              servicesError ? (
                <LoadErrorState onRetry={loadServices} />
              ) : services === null ? (
                <SkeletonList />
              ) : (
                <ServiceStep
                  services={services}
                  selectedId={selectedService?.id ?? null}
                  onSelect={handleSelectService}
                />
              )
            ) : null}

            {step === 2 ? (
              professionalsError ? (
                <LoadErrorState onRetry={() => selectedService && loadProfessionals(selectedService)} />
              ) : professionals === null ? (
                <SkeletonList />
              ) : (
                <ProfessionalStep
                  professionals={professionals}
                  selectedId={selectedProfessional?.id ?? null}
                  onSelect={handleSelectProfessional}
                />
              )
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-6">
                <DateTimeStep
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  slots={slots}
                  isLoadingSlots={isLoadingSlots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  onJoinWaitlist={() => setShowWaitlist(true)}
                  loadError={slotsError}
                  onRetry={() =>
                    selectedProfessional &&
                    selectedService &&
                    loadSlots(selectedProfessional, selectedService, selectedDate)
                  }
                />

                {showWaitlist ? (
                  <WaitlistForm onSubmit={handleJoinWaitlist} onCancel={() => setShowWaitlist(false)} />
                ) : null}

                <Button
                  variant="tenant"
                  disabled={!selectedSlot}
                  onClick={() => setStep(4)}
                  className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </Button>
              </div>
            ) : null}

            {step === 4 && selectedService && selectedProfessional && selectedSlot ? (
              <div className="flex flex-col gap-6">
                <ClientInfoStep
                  service={selectedService}
                  professional={selectedProfessional}
                  startAt={selectedSlot.startAt}
                  clientName={clientName}
                  clientPhone={clientPhone}
                  onChangeName={setClientName}
                  onChangePhone={setClientPhone}
                  errors={formErrors}
                  lockedClient={initialClient ?? undefined}
                />

                {submitError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                ) : null}

                <Button
                  variant="tenant"
                  onClick={handleConfirmBooking}
                  disabled={submitting}
                  className="w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Confirmando..." : "Confirmar agendamento"}
                </Button>
              </div>
            ) : null}
        </motion.div>
      </div>

      {step > 1 ? (
        <button
          type="button"
          onClick={goBack}
          className="mt-6 flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
      ) : null}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-white/5" />
      ))}
    </div>
  );
}

// Distingue uma falha real de carregamento de um catálogo genuinamente vazio — sem isso,
// os dois pareciam a mesma coisa pro visitante (ver ServiceStep/ProfessionalStep).
function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-red-300 p-6 text-center dark:border-red-500/30">
      <p className="text-sm text-red-600 dark:text-red-400">Não foi possível carregar. Tente novamente.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md text-sm font-semibold text-(--tenant-accent) hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--tenant-accent)/40"
      >
        Tentar novamente
      </button>
    </div>
  );
}
