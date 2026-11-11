/**
 * Kolom bantu untuk skema Drizzle (AGENT.md Bagian 13):
 * - UUID v7 dibangkitkan di aplikasi (lihat @petora/core uuidv7) dengan default DB gen_random_uuid()
 *   sebagai fallback agar insert dari SQL murni tetap berfungsi.
 * - Uang = integer Rupiah (bigint). Dilarang float.
 * - Soft delete via deleted_at pada master data.
 */
import { bigint, boolean, timestamp, uuid } from "drizzle-orm/pg-core"

/** PK UUID dengan default gen_random_uuid() (fallback; aplikasi mengirim UUID v7). */
export function id() {
  return uuid("id").primaryKey().defaultRandom()
}

/** Kolom audit standar: created_at/updated_at UTC. */
export function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  }
}

/** Soft delete untuk master data. */
export function softDelete() {
  return { deletedAt: timestamp("deleted_at", { withTimezone: true }) }
}

/** Uang dalam Rupiah integer (bigint). */
export function rupiah(name: string) {
  return bigint(name, { mode: "number" }).notNull()
}

/** Rupiah yang boleh null (mis. harga override). */
export function rupiahOrNull(name: string) {
  return bigint(name, { mode: "number" })
}

/** Flag aktif (bukan soft delete; untuk enable/disable). */
export function activeFlag(def = true) {
  return boolean("is_active").default(def).notNull()
}
