/**
 * Skema Drizzle — domain Klinik (AGENT.md 13, docs/03-erd.md).
 * Fase 6: registrasi & antrian, rekam medis SOAP + versi/addendum, resep & dispensing,
 * vaksinasi & protokol, lab & penunjang, form builder, consent.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core"
import { id, timestamps, softDelete, rupiah } from "./helpers"
import { organization, branches, users } from "./core"
import { customers, pets, productVariants, services } from "./master"

export const visits = pgTable(
  "visits",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    number: text("number").notNull(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id),
    customerId: uuid("customer_id").references(() => customers.id),
    reason: text("reason").notNull(),
    status: text("status", {
      enum: [
        "registered",
        "waiting",
        "in_consult",
        "treatment",
        "discharged",
        "cancelled",
        "no_show"
      ]
    })
      .default("registered")
      .notNull(),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }).defaultNow().notNull(),
    dischargedAt: timestamp("discharged_at", { withTimezone: true }),
    vetId: uuid("vet_id").references(() => users.id),
    weightGrams: integer("weight_grams"),
    invoiceId: uuid("invoice_id"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("visit_org_number_idx").on(t.organizationId, t.number),
    index("visit_branch_status_idx").on(t.branchId, t.status),
    index("visit_pet_idx").on(t.petId)
  ]
)

/** Tiket antrian real-time (nomor urut per cabang per hari; urutan tampil via updated_at/status). */
export const queueTickets = pgTable(
  "queue_tickets",
  {
    id: id(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    day: text("day").notNull(),
    queueNumber: integer("queue_number").notNull(),
    status: text("status", { enum: ["waiting", "called", "in_progress", "done", "skipped"] })
      .default("waiting")
      .notNull(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("qt_branch_day_num_idx").on(t.branchId, t.day, t.queueNumber),
    index("qt_visit_idx").on(t.visitId)
  ]
)

/** Rekam medis per kunjungan — baris utama; konten terkunci di versi. */
export const medicalRecords = pgTable(
  "medical_records",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id),
    status: text("status", { enum: ["draft", "finalized", "addendum"] })
      .default("draft")
      .notNull(),
    finalizedBy: uuid("finalized_by").references(() => users.id),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    /** Konfigurasi visibilitas portal per field (dimiliki record): {chiefComplaint: true, internalNotes: false, ...} */
    portalVisibility: jsonb("portal_visibility")
      .$type<Record<string, boolean>>()
      .default({})
      .notNull(),
    ...timestamps()
  },
  (t) => [
    index("mr_visit_idx").on(t.visitId),
    index("mr_pet_idx").on(t.petId),
    uniqueIndex("mr_visit_unique_idx").on(t.visitId)
  ]
)

/** Versi immutabel rekam medis (SOAP). Addendum = versi baru setelah finalize; tidak pernah mengubah versi lama. */
export const medicalRecordVersions = pgTable(
  "medical_record_versions",
  {
    id: id(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => medicalRecords.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    isAddendum: boolean("is_addendum").default(false).notNull(),
    soap: jsonb("soap")
      .$type<{ subjective?: string; objective?: string; assessment?: string; plan?: string }>()
      .notNull(),
    internalNotes: text("internal_notes"),
    bodyMap: jsonb("body_map"),
    formValues: jsonb("form_values"),
    authoredBy: uuid("authored_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("mrv_record_version_idx").on(t.recordId, t.version)]
)

export const diagnoses = pgTable(
  "diagnoses",
  {
    id: id(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => medicalRecords.id, { onDelete: "cascade" }),
    code: text("code"),
    name: text("name").notNull(),
    isPrimary: boolean("is_primary").default(true).notNull(),
    notedBy: uuid("noted_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("dx_record_idx").on(t.recordId)]
)

export const procedures = pgTable(
  "procedures",
  {
    id: id(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => medicalRecords.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id),
    name: text("name").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    performedBy: uuid("performed_by").references(() => users.id),
    performedAt: timestamp("performed_at", { withTimezone: true }).defaultNow().notNull(),
    billable: boolean("billable").default(true).notNull(),
    invoiceItemId: uuid("invoice_item_id"),
    notes: text("notes"),
    ...timestamps()
  },
  (t) => [index("proc_record_idx").on(t.recordId)]
)

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    recordId: uuid("record_id")
      .notNull()
      .references(() => medicalRecords.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    status: text("status", {
      enum: ["draft", "issued", "partially_dispensed", "dispensed", "cancelled"]
    })
      .default("draft")
      .notNull(),
    prescribedBy: uuid("prescribed_by").references(() => users.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("rx_org_number_idx").on(t.organizationId, t.number),
    index("rx_record_idx").on(t.recordId)
  ]
)

export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: id(),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    dosageText: text("dosage_text").notNull(),
    quantityPrescribed: integer("quantity_prescribed").notNull(),
    quantityDispensed: integer("quantity_dispensed").default(0).notNull(),
    dispensedBy: uuid("dispensed_by").references(() => users.id),
    dispensedAt: timestamp("dispensed_at", { withTimezone: true }),
    invoiceItemId: uuid("invoice_item_id"),
    ...timestamps()
  },
  (t) => [index("rxi_rx_idx").on(t.prescriptionId)]
)

export const vaccineProtocols = pgTable(
  "vaccine_protocols",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    species: text("species").notNull(),
    name: text("name").notNull(),
    /** Jadwal dosis dalam hari sejak dosis pertama, mis. [0, 21, 42] lalu booster tiap 365. */
    doseIntervalsDays: jsonb("dose_intervals_days").$type<number[]>().notNull(),
    boosterIntervalDays: integer("booster_interval_days"),
    vaccineVariantId: uuid("vaccine_variant_id").references(() => productVariants.id),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [index("vp_org_species_idx").on(t.organizationId, t.species)]
)

export const vaccinations = pgTable(
  "vaccinations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id),
    recordId: uuid("record_id").references(() => medicalRecords.id),
    protocolId: uuid("protocol_id").references(() => vaccineProtocols.id),
    vaccineVariantId: uuid("vaccine_variant_id").references(() => productVariants.id),
    batchLabel: text("batch_label"),
    doseNumber: integer("dose_number").notNull(),
    administeredAt: timestamp("administered_at", { withTimezone: true }).defaultNow().notNull(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }),
    administeredBy: uuid("administered_by").references(() => users.id),
    certificateFileId: uuid("certificate_file_id"),
    invoiceItemId: uuid("invoice_item_id"),
    ...timestamps()
  },
  (t) => [index("vac_pet_due_idx").on(t.petId, t.nextDueAt)]
)

export const labOrders = pgTable(
  "lab_orders",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    recordId: uuid("record_id")
      .notNull()
      .references(() => medicalRecords.id),
    number: text("number").notNull(),
    panelName: text("panel_name").notNull(),
    status: text("status", { enum: ["ordered", "collected", "sent_out", "resulted", "cancelled"] })
      .default("ordered")
      .notNull(),
    orderedBy: uuid("ordered_by").references(() => users.id),
    price: rupiah("price").default(0).notNull(),
    invoiceItemId: uuid("invoice_item_id"),
    ...timestamps()
  },
  (t) => [index("lo_record_idx").on(t.recordId), index("lo_status_idx").on(t.status)]
)

export const labResults = pgTable(
  "lab_results",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => labOrders.id, { onDelete: "cascade" }),
    analyte: text("analyte").notNull(),
    valueText: text("value_text"),
    valueNum: integer("value_num_milli"),
    unit: text("unit"),
    refRange: text("ref_range"),
    flag: text("flag", { enum: ["normal", "low", "high", "critical"] }),
    resultFileId: uuid("result_file_id"),
    ...timestamps()
  },
  (t) => [index("lr_order_idx").on(t.orderId)]
)

/** Template formulir dinamis (form builder owner) — definisi field JSON, versi immutabel. */
export const formTemplates = pgTable(
  "form_templates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    key: text("key").notNull(),
    name: text("name").notNull(),
    category: text("category", { enum: ["clinical", "consent", "intake", "custom"] })
      .default("clinical")
      .notNull(),
    latestVersion: integer("latest_version").default(1).notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("ft_org_key_idx").on(t.organizationId, t.key)]
)

export const formTemplateVersions = pgTable(
  "form_template_versions",
  {
    id: id(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => formTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** [{key,label,type,required,options?,portalVisible?,internal?}] */
    fields: jsonb("fields").notNull(),
    publishedBy: uuid("published_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("ftv_template_version_idx").on(t.templateId, t.version)]
)

/** Informed consent digital (juga dipakai bedah Fase 7). */
export const consents = pgTable(
  "consents",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id),
    customerId: uuid("customer_id").references(() => customers.id),
    templateVersionId: uuid("template_version_id").references(() => formTemplateVersions.id),
    purpose: text("purpose").notNull(),
    contentSnapshot: jsonb("content_snapshot").notNull(),
    signatureData: text("signature_data"),
    signedName: text("signed_name"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    documentFileId: uuid("document_file_id"),
    ...timestamps()
  },
  (t) => [index("cons_pet_idx").on(t.petId)]
)

export type Visit = typeof visits.$inferSelect
export type MedicalRecord = typeof medicalRecords.$inferSelect
export type Prescription = typeof prescriptions.$inferSelect
export type Vaccination = typeof vaccinations.$inferSelect
