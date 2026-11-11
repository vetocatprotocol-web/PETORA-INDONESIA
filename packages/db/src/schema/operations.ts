/**
 * Skema Drizzle — domain Operasional Lanjutan & Penjadwalan (AGENT.md 13, docs/03-erd.md).
 * Fase 7: rawat inap, bedah, grooming, penitipan, kalender/janji temu, SDM dasar.
 */
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { id, timestamps, softDelete, rupiah } from "./helpers"
import { organization, branches, users } from "./core"
import { customers, pets, roomsCages, services, productVariants } from "./master"
import { medicalRecords, consents, visits } from "./clinical"

/** Aturan ketersediaan untuk penjadwalan (per cabang/staf/resource). */
export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    staffId: uuid("staff_id").references(() => users.id),
    resourceId: uuid("resource_id"),
    /** [{day:0..6, start:"09:00", end:"17:00"}] */
    weeklySlots: jsonb("weekly_slots").notNull(),
    ...timestamps()
  },
  (t) => [index("avail_branch_idx").on(t.branchId)]
)

/** Cuti/izin/sakit staf — memblokir slot jadwal. */
export const timeOff = pgTable(
  "time_off",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    staffId: uuid("staff_id").notNull().references(() => users.id),
    kind: text("kind", { enum: ["cuti", "izin", "sakit", "dinas_luar"] }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    approvedBy: uuid("approved_by").references(() => users.id),
    note: text("note"),
    ...timestamps()
  },
  (t) => [index("to_staff_range_idx").on(t.staffId, t.startsAt)]
)

export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    number: text("number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    petId: uuid("pet_id").references(() => pets.id),
    serviceId: uuid("service_id").references(() => services.id),
    staffId: uuid("staff_id").references(() => users.id),
    resourceId: uuid("resource_id"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"] }).default("pending").notNull(),
    depositAmount: rupiah("deposit_amount").default(0).notNull(),
    source: text("source", { enum: ["staff", "portal", "whatsapp"] }).default("staff").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("appt_org_number_idx").on(t.organizationId, t.number),
    index("appt_branch_start_idx").on(t.branchId, t.startsAt),
    index("appt_staff_start_idx").on(t.staffId, t.startsAt),
    index("appt_status_idx").on(t.status)
  ]
)

/** Daftar tunggu ketika slot penuh. */
export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    serviceId: uuid("service_id").references(() => services.id),
    customerId: uuid("customer_id").references(() => customers.id),
    petId: uuid("pet_id").references(() => pets.id),
    desiredFrom: timestamp("desired_from", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["waiting", "offered", "converted", "cancelled"] }).default("waiting").notNull(),
    ...timestamps()
  },
  (t) => [index("wl_branch_status_idx").on(t.branchId, t.status)]
)

/** Alur kerja grooming multi-langkah + dokumentasi foto. */
export const groomingJobs = pgTable(
  "grooming_jobs",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    appointmentId: uuid("appointment_id").references(() => appointments.id),
    visitId: uuid("visit_id").references(() => visits.id),
    petId: uuid("pet_id").notNull().references(() => pets.id),
    groomerId: uuid("groomer_id").references(() => users.id),
    packageServiceId: uuid("package_service_id").references(() => services.id),
    stage: text("stage", { enum: ["queued", "bathing", "drying", "cutting", "finishing", "done", "cancelled"] }).default("queued").notNull(),
    beforePhotoFileIds: jsonb("before_photo_file_ids").$type<string[]>().default([]).notNull(),
    afterPhotoFileIds: jsonb("after_photo_file_ids").$type<string[]>().default([]).notNull(),
    notes: text("notes"),
    invoiceId: uuid("invoice_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    ...timestamps()
  },
  (t) => [index("gj_branch_stage_idx").on(t.branchId, t.stage), index("gj_pet_idx").on(t.petId)]
)

/** Reservasi penitipan dengan alokasi kandang & biaya otomatis harian. */
export const boardingReservations = pgTable(
  "boarding_reservations",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    number: text("number").notNull(),
    petId: uuid("pet_id").notNull().references(() => pets.id),
    customerId: uuid("customer_id").references(() => customers.id),
    cageId: uuid("cage_id").references(() => roomsCages.id),
    checkInAt: timestamp("check_in_at", { withTimezone: true }),
    plannedOutAt: timestamp("planned_out_at", { withTimezone: true }).notNull(),
    checkOutAt: timestamp("check_out_at", { withTimezone: true }),
    dailyRate: rupiah("daily_rate").notNull(),
    status: text("status", { enum: ["reserved", "checked_in", "checked_out", "cancelled"] }).default("reserved").notNull(),
    feedingInstructions: text("feeding_instructions"),
    medicationNotes: text("medication_notes"),
    invoiceId: uuid("invoice_id"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("br_org_number_idx").on(t.organizationId, t.number),
    index("br_cage_range_idx").on(t.cageId, t.plannedOutAt),
    index("br_status_idx").on(t.status)
  ]
)

/** Log harian penitipan (nafsu makan, aktivitas, foto) — terlihat di portal bila owner mengizinkan. */
export const boardingDailyLogs = pgTable(
  "boarding_daily_logs",
  {
    id: id(),
    reservationId: uuid("reservation_id").notNull().references(() => boardingReservations.id, { onDelete: "cascade" }),
    logDate: text("log_date").notNull(),
    appetite: text("appetite", { enum: ["baik", "sedang", "buruk", "tidak_makan"] }),
    activity: text("activity", { enum: ["aktif", "normal", "lesu"] }),
    toilet: text("toilet"),
    mood: text("mood"),
    note: text("note"),
    photoFileIds: jsonb("photo_file_ids").$type<string[]>().default([]).notNull(),
    sharedToPortal: text("shared_to_portal").default("true").notNull(),
    loggedBy: uuid("logged_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("bdl_res_date_idx").on(t.reservationId, t.logDate)]
)

/** Rawat inap: CPPT (Catatan Perkembangan Pasien Terintegrasi). */
export const admissions = pgTable(
  "admissions",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    visitId: uuid("visit_id").notNull().references(() => visits.id),
    petId: uuid("pet_id").notNull().references(() => pets.id),
    roomCageId: uuid("room_cage_id").references(() => roomsCages.id),
    admittingVetId: uuid("admitting_vet_id").references(() => users.id),
    diagnosisSummary: text("diagnosis_summary").notNull(),
    admittedAt: timestamp("admitted_at", { withTimezone: true }).defaultNow().notNull(),
    dischargedAt: timestamp("discharged_at", { withTimezone: true }),
    status: text("status", { enum: ["active", "discharged", "transferred", "deceased"] }).default("active").notNull(),
    dailyChargeInvoiceId: uuid("daily_charge_invoice_id"),
    ...timestamps()
  },
  (t) => [index("adm_branch_status_idx").on(t.branchId, t.status), index("adm_pet_idx").on(t.petId)]
)

export const observations = pgTable(
  "observations",
  {
    id: id(),
    admissionId: uuid("admission_id").notNull().references(() => admissions.id, { onDelete: "cascade" }),
    observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
    vitals: jsonb("vitals").$type<{ hr?: number; rr?: number; tempC10?: number; spo2?: number }>(),
    note: text("note").notNull(),
    observerId: uuid("observer_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("obs_admission_time_idx").on(t.admissionId, t.observedAt)]
)

/** Jadwal pemberian obat inap (jam tetap; worker mengingatkan). */
export const medicationSchedules = pgTable(
  "medication_schedules",
  {
    id: id(),
    admissionId: uuid("admission_id").notNull().references(() => admissions.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id),
    drugName: text("drug_name").notNull(),
    dosageText: text("dosage_text").notNull(),
    timesPerDay: integer("times_per_day").default(2).notNull(),
    timeSlots: jsonb("time_slots").$type<string[]>().notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    givenLog: jsonb("given_log").$type<Record<string, string>>().default({}).notNull(),
    prescribedBy: uuid("prescribed_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [index("ms_admission_idx").on(t.admissionId)]
)

/** Pembedahan + informed consent digital + pencatatan perioperatif. */
export const surgeries = pgTable(
  "surgeries",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    recordId: uuid("record_id").references(() => medicalRecords.id),
    petId: uuid("pet_id").notNull().references(() => pets.id),
    procedureName: text("procedure_name").notNull(),
    surgeonId: uuid("surgeon_id").references(() => users.id),
    assistantIds: jsonb("assistant_ids").$type<string[]>().default([]).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    consentId: uuid("consent_id").references(() => consents.id),
    anesthesiaNote: text("anesthesia_note"),
    intraOpNote: text("intra_op_note"),
    postOpNote: text("post_op_note"),
    status: text("status", { enum: ["planned", "consented", "in_progress", "completed", "cancelled"] }).default("planned").notNull(),
    invoiceId: uuid("invoice_id"),
    ...timestamps()
  },
  (t) => [index("surg_branch_sched_idx").on(t.branchId, t.scheduledAt), index("surg_status_idx").on(t.status)]
)

/** Jadwal kerja staf (shift HR) + absensi. */
export const workSchedules = pgTable(
  "work_schedules",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    staffId: uuid("staff_id").notNull().references(() => users.id),
    workDate: text("work_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    roleOnShift: text("role_on_shift"),
    ...timestamps()
  },
  (t) => [uniqueIndex("ws_staff_date_idx").on(t.staffId, t.workDate), index("ws_branch_date_idx").on(t.branchId, t.workDate)]
)

export const attendance = pgTable(
  "attendance",
  {
    id: id(),
    scheduleId: uuid("schedule_id").references(() => workSchedules.id),
    staffId: uuid("staff_id").notNull().references(() => users.id),
    workDate: text("work_date").notNull(),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    status: text("status", { enum: ["present", "late", "absent", "sick", "leave"] }).default("present").notNull(),
    ...timestamps()
  },
  (t) => [uniqueIndex("att_staff_date_idx").on(t.staffId, t.workDate)]
)

export type Appointment = typeof appointments.$inferSelect
export type BoardingReservation = typeof boardingReservations.$inferSelect
export type GroomingJob = typeof groomingJobs.$inferSelect
export type Admission = typeof admissions.$inferSelect
