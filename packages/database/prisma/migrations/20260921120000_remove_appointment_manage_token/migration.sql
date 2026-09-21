-- O link público por token foi removido: gerenciar um agendamento agora exige login (/minha-conta).
DROP INDEX "Appointment_manageToken_key";
ALTER TABLE "Appointment" DROP COLUMN "manageToken";
