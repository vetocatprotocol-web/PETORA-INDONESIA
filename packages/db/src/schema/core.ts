/**
 * Skema Drizzle — domain Inti Platform (AGENT.md 13: "Inti").
 * Fase 2: autentikasi, RBAC, multi-cabang, pengaturan, audit, penomoran dokumen, file.
 * Aturan AGENT.md: uang = bigint Rupiah; soft delete untuk master; indeks jalur kueri utama;
 * FK sebagai pertahanan kedua.
 */
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, integer, boolean, bigint } from "drizzle-orm/pg-core"
import { id, timestamps, softDelete, activeFlag } from "./helpers"

export const organization = pgTable("organization", {
  id: id(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  ...timestamps(),
  ...softDelete()
})

export const branches = pgTable(
  "branches",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    contact: text("contact"),
    timezone: text("timezone").default("Asia/Jakarta").notNull(),
    operatingHours: jsonb("operating_hours"),
    receiptHeader: text("receipt_header"),
    receiptFooter: text("receipt_footer"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("branches_org_code_idx").on(t.organizationId, t.code), index("branches_deleted_idx").on(t.deletedAt)]
)

export const users = pgTable(
  "users",
  {
    id: id(),
    /** Dua realm terpisah: staf (admin) dan pelanggan (portal). */
    realm: text("realm", { enum: ["staff", "customer"] }).notNull(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    isActive: activeFlag(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    phoneVerified: boolean("phone_verified").default(false).notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorSecretEnc: text("two_factor_secret_enc"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_phone_idx").on(t.phone),
    index("users_realm_idx").on(t.realm),
    index("users_deleted_idx").on(t.deletedAt)
  ]
)

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    employeeCode: text("employee_code"),
    positionTitle: text("position_title"),
    strNumber: text("str_number"),
    strExpiryAt: timestamp("str_expiry_at", { withTimezone: true }),
    hiredAt: timestamp("hired_at", { withTimezone: true }),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [index("staff_profiles_user_idx").on(t.userId)]
)

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    realm: text("realm", { enum: ["staff", "customer"] }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    ...timestamps()
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expiry_idx").on(t.expiresAt)]
)

export const roles = pgTable(
  "roles",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    key: text("key").notNull(),
    name: text("name").notNull(),
    /** Role bawaan sistem: dapat diubah/diklon tapi Owner tidak dapat dihapus/dikurangi. */
    isSystem: boolean("is_system").default(false).notNull(),
    isOwner: boolean("is_owner").default(false).notNull(),
    defaultScope: text("default_scope", { enum: ["all_branches", "assigned_branches", "self_only"] })
      .default("assigned_branches")
      .notNull(),
    /** Batas numerik per role (docs/04): diskon %, diskon Rp, refund Rp, void Rp, tunai Rp. Null = tanpa batas. */
    limits: jsonb("limits"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("roles_org_key_idx").on(t.organizationId, t.key)]
)

export const permissions = pgTable(
  "permissions",
  {
    key: text("key").primaryKey(),
    module: text("module").notNull(),
    descriptionId: text("description_id").notNull(),
    descriptionEn: text("description_en").notNull(),
    risk: text("risk", { enum: ["rendah", "sedang", "tinggi", "kritis"] }).notNull(),
    ...timestamps()
  }
)

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key),
    ...timestamps()
  },
  (t) => [uniqueIndex("role_permissions_pk").on(t.roleId, t.permissionKey)]
)

export const userRoleAssignments = pgTable(
  "user_role_assignments",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    scope: text("scope", { enum: ["all_branches", "assigned_branches", "self_only"] }).notNull(),
    /** Untuk assigned_branches: daftar cabang penugasan (tabel terpisah di fase berikutnya bila butuh query per-baris). */
    branchIds: jsonb("branch_ids").$type<string[]>().default([]),
    ...timestamps()
  },
  (t) => [index("ura_user_idx").on(t.userId), uniqueIndex("ura_unique_idx").on(t.userId, t.roleId)]
)

export const userPermissionOverrides = pgTable(
  "user_permission_overrides",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key),
    effect: text("effect", { enum: ["grant", "deny"] }).notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [uniqueIndex("upo_unique_idx").on(t.userId, t.permissionKey)]
)

export const approvalPolicies = pgTable(
  "approval_policies",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    /** Aksi yang butuh persetujuan, mis. `pos.sale.void`. */
    action: text("action").notNull(),
    /** Kriteria ambang (mis. {amountGt: 500000}); null = selalu butuh approval. */
    criteria: jsonb("criteria"),
    /** Role yang boleh menyetujui. */
    approverRoleKeys: jsonb("approver_role_keys").$type<string[]>().notNull(),
    requirePin: boolean("require_pin").default(true).notNull(),
    ...timestamps()
  },
  (t) => [uniqueIndex("approval_policy_action_idx").on(t.organizationId, t.action)]
)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organization.id),
    branchId: uuid("branch_id").references(() => branches.id),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    meta: jsonb("meta"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("audit_actor_idx").on(t.actorId), index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)]
)

export const settings = pgTable(
  "settings",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id").references(() => branches.id),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...timestamps()
  },
  (t) => [uniqueIndex("settings_scope_key_idx").on(t.organizationId, t.branchId, t.key)]
)

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    key: text("key").notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    config: jsonb("config"),
    ...timestamps()
  },
  (t) => [uniqueIndex("feature_flags_org_key_idx").on(t.organizationId, t.key)]
)

/** Penomoran dokumen atomik: INV/{BRANCH}/{YYYY}{MM}/{SEQ:5} (AGENT.md 4.3). */
export const documentSequences = pgTable(
  "document_sequences",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id").references(() => branches.id),
    docType: text("doc_type").notNull(),
    period: text("period").notNull(),
    lastSeq: bigint("last_seq", { mode: "number" }).default(0).notNull(),
    pattern: text("pattern").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [uniqueIndex("docseq_unique_idx").on(t.organizationId, t.branchId, t.docType, t.period)]
)

export const files = pgTable(
  "files",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    storageKey: text("storage_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: text("checksum_sha256"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    ...timestamps()
  }
)

/** OTP WhatsApp/email untuk portal & pemulihan. */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id),
    channel: text("channel", { enum: ["whatsapp", "email"] }).notNull(),
    destination: text("destination").notNull(),
    codeHash: text("code_hash").notNull(),
    purpose: text("purpose", { enum: ["login", "claim", "reset", "approval"] }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps()
  },
  (t) => [index("otp_dest_idx").on(t.destination), index("otp_expiry_idx").on(t.expiresAt)]
)

export type Organization = typeof organization.$inferSelect
export type Branch = typeof branches.$inferSelect
export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Role = typeof roles.$inferSelect
export type PermissionRow = typeof permissions.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
export type FileRow = typeof files.$inferSelect
