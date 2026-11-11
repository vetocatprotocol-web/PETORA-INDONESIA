/**
 * Skema Drizzle — domain Integrasi & Notifikasi (AGENT.md 13).
 * Kredensial disimpan terenkripsi (ENCRYPTION_MASTER_KEY) — jangan pernah mengirim rahasia ke browser atau log.
 */
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { id, timestamps, softDelete } from "./helpers"
import { organization, branches, users } from "./core"

/** Koneksi integrasi per organisasi; kredensial dalam kolom terenkripsi (envelope AES-256-GCM, base64). */
export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    /** Kunci adapter dari registry kode, mis. `whatsapp_cloud`, `midtrans`, `xendit`, `resend`, `s3`. */
    adapterKey: text("adapter_key").notNull(),
    name: text("name").notNull(),
    /** Konfigurasi non-rahasia (form dinamis dari skema adapter). */
    config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
    /** Kredensial terenkripsi (payload envelope, bukan plaintext). */
    credentialsEnc: text("credentials_enc"),
    environment: text("environment", { enum: ["sandbox", "production"] }).default("sandbox").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    lastTestAt: timestamp("last_test_at", { withTimezone: true }),
    lastTestOk: boolean("last_test_ok"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [index("ic_org_adapter_idx").on(t.organizationId, t.adapterKey)]
)

/** Routing: koneksi mana dipakai untuk jenis pesan/transaksi apa (bisa per cabang). */
export const integrationRoutes = pgTable(
  "integration_routes",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id").references(() => branches.id),
    purpose: text("purpose").notNull(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id),
    ...timestamps()
  },
  (t) => [uniqueIndex("ir_scope_purpose_idx").on(t.organizationId, t.branchId, t.purpose)]
)

/** Ingest webhook dengan idempotensi (AGENT.md 4.3). */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id),
    providerEventId: text("provider_event_id"),
    idempotencyKey: text("idempotency_key").unique(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    status: text("status", { enum: ["received", "processing", "done", "failed", "ignored_duplicate"] })
      .default("received")
      .notNull(),
    error: text("error")
  },
  (t) => [index("we_connection_status_idx").on(t.connectionId, t.status), index("we_provider_idx").on(t.providerEventId)]
)

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    key: text("template_key").notNull(),
    channel: text("channel", { enum: ["whatsapp", "email", "inbox"] }).notNull(),
    lang: text("lang").default("id").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    variables: jsonb("variables").$type<string[]>().default([]).notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("mt_key_channel_lang_idx").on(t.organizationId, t.key, t.channel, t.lang)]
)

export const notificationRules = pgTable(
  "notification_rules",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    eventKey: text("event_key").notNull(),
    channel: text("channel", { enum: ["whatsapp", "email", "inbox"] }).notNull(),
    templateKey: text("template_key").notNull(),
    audience: text("audience", { enum: ["customer", "staff_role", "owner"] }).notNull(),
    audienceRef: text("audience_ref"),
    enabled: boolean("enabled").default(true).notNull(),
    quietHours: jsonb("quiet_hours"),
    ...timestamps()
  },
  (t) => [uniqueIndex("nr_event_channel_idx").on(t.organizationId, t.eventKey, t.channel, t.templateKey)]
)

/** Antrian outbound (diproses worker BullMQ dengan retry). */
export const outboundMessages = pgTable(
  "outbound_messages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    channel: text("channel", { enum: ["whatsapp", "email"] }).notNull(),
    connectionId: uuid("connection_id").references(() => integrationConnections.id),
    to: text("to").notNull(),
    templateKey: text("template_key"),
    content: text("content").notNull(),
    status: text("status", { enum: ["queued", "sending", "sent", "delivered", "failed", "cancelled"] })
      .default("queued")
      .notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    relatedType: text("related_type"),
    relatedId: uuid("related_id"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps()
  },
  (t) => [index("om_status_idx").on(t.status), index("om_related_idx").on(t.relatedType, t.relatedId)]
)

/** Inbox notifikasi dalam aplikasi (realtime via SSE). */
export const notificationInbox = pgTable(
  "notification_inbox",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("inbox_user_read_idx").on(t.userId, t.readAt)]
)

export type IntegrationConnection = typeof integrationConnections.$inferSelect
export type WebhookEvent = typeof webhookEvents.$inferSelect
export type OutboundMessage = typeof outboundMessages.$inferSelect
