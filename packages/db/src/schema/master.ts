/**
 * Skema Drizzle — domain Data Induk / CRM & Katalog (AGENT.md 13, docs/03-erd.md).
 * Fase 3: pelanggan, hewan, supplier, kategori/merek/satuan, produk & varian, layanan & paket.
 */
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
  date
} from "drizzle-orm/pg-core"
import { id, timestamps, softDelete, activeFlag, rupiahOrNull, rupiah } from "./helpers"
import { organization, branches, users } from "./core"

export const customers = pgTable(
  "customers",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    /** Cabang tempat pelanggan pertama terdaftar (untuk scoping; manajer melihat lintas cabang sesuai role). */
    primaryBranchId: uuid("primary_branch_id").references(() => branches.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    birthDate: date("birth_date"),
    notes: text("notes"),
    marketingOptOut: text("marketing_opt_out").default("false").notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [
    uniqueIndex("customers_org_code_idx").on(t.organizationId, t.code),
    index("customers_phone_idx").on(t.phone),
    index("customers_name_idx").on(t.name),
    index("customers_deleted_idx").on(t.deletedAt)
  ]
)

/** Akun portal pelanggan (realm customer) — satu user bisa mengklaim banyak kartu pelanggan. */
export const customerAccounts = pgTable(
  "customer_accounts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: text("status", { enum: ["pending_claim", "claimed", "rejected"] })
      .default("pending_claim")
      .notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("ca_user_customer_idx").on(t.userId, t.customerId),
    index("ca_customer_idx").on(t.customerId)
  ]
)

export const pets = pgTable(
  "pets",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    species: text("species", { enum: ["anjing", "kucing", "aves", "exotic", "lainnya"] }).notNull(),
    breed: text("breed"),
    sex: text("sex", { enum: ["jantan", "betina", "unknown"] })
      .default("unknown")
      .notNull(),
    birthDate: date("birth_date"),
    color: text("color"),
    weightKg: integer("weight_grams"),
    microchipId: text("microchip_id"),
    sterilized: text("sterilized").default("false").notNull(),
    photoFileId: uuid("photo_file_id"),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [
    uniqueIndex("pets_org_code_idx").on(t.organizationId, t.code),
    index("pets_name_idx").on(t.name),
    index("pets_chip_idx").on(t.microchipId)
  ]
)

export const petOwners = pgTable(
  "pet_owners",
  {
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    relation: text("relation", { enum: ["owner", "co_owner", "emergency"] })
      .default("owner")
      .notNull(),
    isPrimary: text("is_primary").default("true").notNull(),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("pet_owners_pk").on(t.petId, t.customerId),
    index("po_customer_idx").on(t.customerId)
  ]
)

/** Riwayat berat untuk kurva pertumbuhan (gram agar tetap integer). */
export const petWeights = pgTable(
  "pet_weights",
  {
    id: id(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    weighedAt: timestamp("weighed_at", { withTimezone: true }).defaultNow().notNull(),
    weightGrams: integer("weight_grams").notNull(),
    measuredBy: uuid("measured_by").references(() => users.id),
    visitId: uuid("visit_id"),
    source: text("source", { enum: ["visit", "boarding", "grooming", "manual", "portal"] })
      .default("manual")
      .notNull(),
    ...timestamps()
  },
  (t) => [index("pw_pet_time_idx").on(t.petId, t.weighedAt)]
)

export const suppliers = pgTable(
  "suppliers",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    npwp: text("npwp"),
    paymentTermsDays: integer("payment_terms_days").default(30).notNull(),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [
    uniqueIndex("suppliers_org_code_idx").on(t.organizationId, t.code),
    index("suppliers_name_idx").on(t.name)
  ]
)

export const categories = pgTable(
  "categories",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("categories_org_name_idx").on(t.organizationId, t.name)]
)

export const brands = pgTable(
  "brands",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("brands_org_name_idx").on(t.organizationId, t.name)]
)

export const units = pgTable(
  "units",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    abbreviation: text("abbreviation").notNull(),
    kind: text("kind", { enum: ["count", "weight", "volume", "length", "time"] })
      .default("count")
      .notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("units_org_name_idx").on(t.organizationId, t.name)]
)

/** Konversi antar satuan (mis. 1 pack = 24 pcs) — faktor integer/pecah via numerator/denominator. */
export const unitConversions = pgTable(
  "unit_conversions",
  {
    id: id(),
    fromUnitId: uuid("from_unit_id")
      .notNull()
      .references(() => units.id),
    toUnitId: uuid("to_unit_id")
      .notNull()
      .references(() => units.id),
    numerator: integer("numerator").notNull(),
    denominator: integer("denominator").notNull().default(1),
    ...timestamps()
  },
  (t) => [uniqueIndex("uc_pair_idx").on(t.fromUnitId, t.toUnitId)]
)

export const products = pgTable(
  "products",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    brandId: uuid("brand_id").references(() => brands.id),
    unitId: uuid("unit_id").references(() => units.id),
    isServiceFree: text("is_service_free").default("false").notNull(),
    requiresPrescription: text("requires_prescription").default("false").notNull(),
    taxable: text("taxable").default("true").notNull(),
    trackStock: text("track_stock").default("true").notNull(),
    minStockQty: integer("min_stock_qty").default(0).notNull(),
    maxStockQty: integer("max_stock_qty"),
    expiryAlertDays: integer("expiry_alert_days").default(60).notNull(),
    taxRateId: uuid("tax_rate_id"),
    imageFileId: uuid("image_file_id"),
    description: text("description"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [
    uniqueIndex("products_org_code_idx").on(t.organizationId, t.code),
    index("products_name_idx").on(t.name),
    index("products_cat_idx").on(t.categoryId),
    index("products_deleted_idx").on(t.deletedAt)
  ]
)

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    sizeLabel: text("size_label"),
    price: rupiahOrNull("price"),
    cost: rupiahOrNull("cost"),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("pv_product_sku_idx").on(t.productId, t.sku), index("pv_sku_idx").on(t.sku)]
)

export const productBarcodes = pgTable(
  "product_barcodes",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    barcode: text("barcode").notNull(),
    ...timestamps()
  },
  (t) => [uniqueIndex("pb_barcode_idx").on(t.barcode)]
)

/** Daftar harga (mis. grosir, member) — baris per varian/customer-tier. */
export const priceLists = pgTable(
  "price_lists",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    tier: integer("tier").default(1).notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("pl_org_name_idx").on(t.organizationId, t.name)]
)

export const branchPrices = pgTable(
  "branch_prices",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    priceListId: uuid("price_list_id").references(() => priceLists.id),
    price: rupiah("price"),
    ...timestamps()
  },
  (t) => [uniqueIndex("bp_branch_variant_list_idx").on(t.branchId, t.variantId, t.priceListId)]
)

export const services = pgTable(
  "services",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    durationMinutes: integer("duration_minutes").default(30).notNull(),
    price: rupiahOrNull("price"),
    commissionEligible: text("commission_eligible").default("false").notNull(),
    requiresResource: text("requires_resource").default("false").notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [
    uniqueIndex("services_org_code_idx").on(t.organizationId, t.code),
    index("services_name_idx").on(t.name)
  ]
)

export const servicePackages = pgTable(
  "service_packages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    price: rupiah("price"),
    validityDays: integer("validity_days").default(90).notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("sp_org_code_idx").on(t.organizationId, t.code)]
)

export const servicePackageItems = pgTable(
  "service_package_items",
  {
    id: id(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => servicePackages.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id),
    productId: uuid("product_id").references(() => products.id),
    quantity: integer("quantity").default(1).notNull(),
    ...timestamps()
  },
  (t) => [index("spi_package_idx").on(t.packageId)]
)

export const resources = pgTable(
  "resources",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: text("name").notNull(),
    kind: text("kind", {
      enum: ["table_grooming", "mesin_cuci", "dryer", "ruangan", "dokter", "peralatan_lab"]
    }).notNull(),
    capacity: integer("capacity").default(1).notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [index("res_branch_kind_idx").on(t.branchId, t.kind)]
)

export const roomsCages = pgTable(
  "rooms_cages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    kind: text("kind", {
      enum: ["kandang_kucing", "kandang_anjing", "kamar_inap", "isolasi", "icu"]
    }).notNull(),
    sizeLabel: text("size_label"),
    dailyRate: rupiahOrNull("daily_rate"),
    isActive: activeFlag(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [
    uniqueIndex("rc_branch_code_idx").on(t.branchId, t.code),
    index("rc_branch_kind_idx").on(t.branchId, t.kind)
  ]
)

export const taxRates = pgTable(
  "tax_rates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    /** Persen × 100 (mis. 11% = 1100) agar integer. */
    rateBps: integer("rate_bps").notNull(),
    isDefault: text("is_default").default("false").notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("tax_org_name_idx").on(t.organizationId, t.name)]
)

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    key: text("key").notNull(),
    name: text("name").notNull(),
    kind: text("kind", {
      enum: [
        "cash",
        "debit",
        "credit",
        "qris",
        "ewallet",
        "va",
        "transfer",
        "deposit",
        "voucher",
        "kredit"
      ]
    }).notNull(),
    gatewayAdapter: text("gateway_adapter"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: activeFlag(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("pm_org_key_idx").on(t.organizationId, t.key)]
)

export type Customer = typeof customers.$inferSelect
export type Pet = typeof pets.$inferSelect
export type Product = typeof products.$inferSelect
export type ProductVariant = typeof productVariants.$inferSelect
export type Service = typeof services.$inferSelect
export type Supplier = typeof suppliers.$inferSelect
