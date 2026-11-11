import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core"

export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
})

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    contact: text("contact"),
    timezone: text("timezone").default("Asia/Jakarta").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => [index("branches_org_id_idx").on(t.organizationId), index("branches_deleted_idx").on(t.deletedAt)]
)

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    realm: text("realm", { enum: ["staff", "customer"] }).notNull(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    phoneVerified: boolean("phone_verified").default(false).notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => [index("users_realm_idx").on(t.realm), index("users_deleted_idx").on(t.deletedAt)]
)

export const branchesRelations = {}
export const usersRelations = {}
