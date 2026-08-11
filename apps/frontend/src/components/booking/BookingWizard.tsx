"use client";

import { useEffect, useState } from "react";
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

export function BookingWizard({ slug, tenantName }: { slug: string; tenantName: string }) {
  const [step, setStep] = useState<Step>(1);

  const [services, setServices] = useState<PublicService[] | null>(null);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);

  const [professionals, setProfessionals] = useState<PublicProfessional[] | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<PublicProfessional | null>(
    null,
  );

  const [selectedDate, setSelectedDate] = useState(() =>
    DateTime.now().setZone(TIMEZONE).toISODate()!,
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [formErrors, setFormErrors] = useState<{ clientName?: string; clientPhone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof publicApi.createBooking>> | null>(
    null,
  );

  useEffect(() => {
    publicApi.getServices(slug).then(setServices).catch(() => setServices([]));
  }, [slug]);

  useEffect(() => {
    if (!selectedService) return;
    publicApi
      .getProfessionals(slug, selectedService.id)
      .then(setProfessionals)
      .catch(() => setProfessionals([]));
  }, [slug, selectedService]);

  useEffect(() => {
    if (!selectedProfessional || !selectedService) return;
    publicApi
      .getAvailability(slug, selectedProfessional.id, selectedService.id, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [slug, selectedProfessional, selectedService, selectedDate]);

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  function handleSelectService(service: PublicService) {
    setSelectedService(service);
    setProfessionals(null);
    setSelectedProfessional(null);
    setStep(2);
  }

  function handleSelectProfessional(professional: PublicProfessional) {
    setSelectedProfessional(professional);
    setSelectedSlot(null);
    setShowWaitlist(false);
    setIsLoadingSlots(true);
    setStep(3);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowWaitlist(false);
    setIsLoadingSlots(true);
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
    const errors: typeof formErrors = {};
    if (clientName.trim().length < 2) errors.clientName = "Informe seu nome completo.";
    if (clientPhone.trim().length < 8) errors.clientPhone = "Informe um telefone válido.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
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
        <StepIndicator currentStep={step} />
      </div>

      <div className="mt-8">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 ? (
              services === null ? (
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
              professionals === null ? (
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
                />

                {showWaitlist ? (
                  <WaitlistForm onSubmit={handleJoinWaitlist} onCancel={() => setShowWaitlist(false)} />
                ) : null}

                <Button
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
                />

                {submitError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                ) : null}

                <Button
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
