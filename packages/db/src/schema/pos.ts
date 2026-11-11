/**
 * Skema Drizzle — domain POS & Transaksi Pembayaran (AGENT.md 13, docs/03-erd.md).
 * Fase 5: shift kasir, invoice + item, pembayaran multi-metode/split, attempt gateway, refund, piutang, deposit, voucher, poin.
 */
import {
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
import { customers, products, productVariants, services, paymentMethods } from "./master"

export const cashierShifts = pgTable(
  "cashier_shifts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    cashierId: uuid("cashier_id")
      .notNull()
      .references(() => users.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    openingFloat: rupiah("opening_float").default(0).notNull(),
    expectedCash: rupiah("expected_cash"),
    countedCash: rupiah("counted_cash"),
    variance: rupiah("variance"),
    status: text("status", { enum: ["open", "closing", "closed"] })
      .default("open")
      .notNull(),
    notes: text("notes"),
    ...timestamps()
  },
  (t) => [
    index("cs_branch_status_idx").on(t.branchId, t.status),
    index("cs_cashier_idx").on(t.cashierId)
  ]
)

/** Kas tunai manual (setoran/penarikan kecil) yang terkait shift. */
export const cashMovements = pgTable(
  "cash_movements",
  {
    id: id(),
    shiftId: uuid("shift_id").references(() => cashierShifts.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    kind: text("kind", {
      enum: ["float_in", "petty_cash_out", "change_error", "deposit_pickup"]
    }).notNull(),
    amount: rupiah("amount").notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("cm_shift_idx").on(t.shiftId)]
)

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    number: text("number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    /** Kunjungan klinik / booking yang menagih (tagihan gabungan). */
    visitId: uuid("visit_id"),
    shiftId: uuid("shift_id").references(() => cashierShifts.id),
    status: text("status", {
      enum: ["draft", "held", "open", "partial", "paid", "void", "refunded", "consolidated"]
    })
      .default("open")
      .notNull(),
    subtotal: rupiah("subtotal").default(0).notNull(),
    discountTotal: rupiah("discount_total").default(0).notNull(),
    taxTotal: rupiah("tax_total").default(0).notNull(),
    roundingAdjustment: rupiah("rounding_adjustment").default(0).notNull(),
    grandTotal: rupiah("grand_total").default(0).notNull(),
    paidTotal: rupiah("paid_total").default(0).notNull(),
    voidedBy: uuid("voided_by").references(() => users.id),
    voidReason: text("void_reason"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    dueAt: timestamp("due_at", { withTimezone: true }),
    meta: jsonb("meta"),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("inv_org_number_idx").on(t.organizationId, t.number),
    index("inv_branch_status_idx").on(t.branchId, t.status),
    index("inv_customer_idx").on(t.customerId),
    index("inv_visit_idx").on(t.visitId),
    index("inv_shift_idx").on(t.shiftId)
  ]
)

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: id(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["product", "service", "package", "daily_charge", "manual", "voucher"]
    }).notNull(),
    productId: uuid("product_id").references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    serviceId: uuid("service_id").references(() => services.id),
    description: text("description").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: rupiah("unit_price").notNull(),
    discountAmount: rupiah("discount_amount").default(0).notNull(),
    taxAmount: rupiah("tax_amount").default(0).notNull(),
    lineTotal: rupiah("line_total").notNull(),
    /** Stok sudah dipotong untuk baris ini? (idempotensi potongan stok). */
    stockApplied: text("stock_applied").default("false").notNull(),
    performedBy: uuid("performed_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [index("ii_invoice_idx").on(t.invoiceId), index("ii_variant_idx").on(t.variantId)]
)

export const payments = pgTable(
  "payments",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    methodId: uuid("method_id").references(() => paymentMethods.id),
    methodKind: text("method_kind", {
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
    amount: rupiah("amount").notNull(),
    changeGiven: rupiah("change_given").default(0).notNull(),
    reference: text("reference"),
    status: text("status", { enum: ["pending", "completed", "failed", "cancelled", "refunded"] })
      .default("completed")
      .notNull(),
    receivedBy: uuid("received_by").references(() => users.id),
    paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps()
  },
  (t) => [
    index("pay_invoice_idx").on(t.invoiceId),
    index("pay_branch_paidat_idx").on(t.branchId, t.paidAt)
  ]
)

/** Percobaan pembayaran via gateway (Midtrans/Xendit) — status real-time dari webhook. */
export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    connectionId: uuid("connection_id"),
    adapterKey: text("adapter_key").notNull(),
    channel: text("channel", {
      enum: ["qris", "ewallet", "va", "card", "bank_transfer"]
    }).notNull(),
    amount: rupiah("amount").notNull(),
    providerOrderId: text("provider_order_id").notNull(),
    idempotencyKey: text("idempotency_key").unique(),
    status: text("status", {
      enum: ["created", "pending", "paid", "expired", "failed", "refunded", "partial_refund"]
    })
      .default("created")
      .notNull(),
    providerPayload: jsonb("provider_payload"),
    qrUrl: text("qr_url"),
    vaNumber: text("va_number"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("pa_provider_order_idx").on(t.adapterKey, t.providerOrderId),
    index("pa_invoice_idx").on(t.invoiceId),
    index("pa_status_idx").on(t.status)
  ]
)

export const refunds = pgTable(
  "refunds",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    paymentId: uuid("payment_id").references(() => payments.id),
    number: text("number").notNull(),
    amount: rupiah("amount").notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["requested", "approved", "rejected", "processed"] })
      .default("requested")
      .notNull(),
    requestedBy: uuid("requested_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    ...timestamps()
  },
  (t) => [
    uniqueIndex("rf_org_number_idx").on(t.organizationId, t.number),
    index("rf_invoice_idx").on(t.invoiceId)
  ]
)

/** Retur barang pelanggan (mengembalikan stok + membuat kredit). */
export const customerReturns = pgTable(
  "customer_returns",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    number: text("number").notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["draft", "approved", "posted", "cancelled"] })
      .default("draft")
      .notNull(),
    restock: text("restock").default("true").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [uniqueIndex("cr_org_number_idx").on(t.organizationId, t.number)]
)

export const customerReturnItems = pgTable(
  "customer_return_items",
  {
    id: id(),
    returnId: uuid("return_id")
      .notNull()
      .references(() => customerReturns.id, { onDelete: "cascade" }),
    invoiceItemId: uuid("invoice_item_id").references(() => invoiceItems.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    unitPrice: rupiah("unit_price").notNull(),
    ...timestamps()
  },
  (t) => [index("cri_return_idx").on(t.returnId)]
)

export const vouchers = pgTable(
  "vouchers",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    code: text("code").notNull(),
    kind: text("kind", { enum: ["amount", "percent", "free_service"] }).notNull(),
    value: rupiah("value").notNull(),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").default(0).notNull(),
    perCustomerLimit: integer("per_customer_limit").default(1).notNull(),
    minPurchase: rupiah("min_purchase").default(0).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: text("is_active").default("true").notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("vou_org_code_idx").on(t.organizationId, t.code)]
)

/** Deposit pelanggan (saldo prabayar) — ledger append-only. */
export const customerDeposits = pgTable(
  "customer_deposits",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    kind: text("kind", { enum: ["topup", "spend", "refund_credit", "adjustment"] }).notNull(),
    amount: rupiah("amount").notNull(),
    balanceAfter: rupiah("balance_after").notNull(),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("dep_customer_idx").on(t.customerId)]
)

/** Ledger poin loyalitas. */
export const loyaltyLedgers = pgTable(
  "loyalty_ledgers",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    points: integer("points").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").notNull(),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("ll_customer_idx").on(t.customerId)]
)

/** Piutang pelanggan (term of payment / credit). */
export const receivables = pgTable(
  "receivables",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    amount: rupiah("amount").notNull(),
    remaining: rupiah("remaining").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: text("status", { enum: ["open", "partial", "settled", "written_off"] })
      .default("open")
      .notNull(),
    ...timestamps()
  },
  (t) => [
    index("recv_customer_status_idx").on(t.customerId, t.status),
    index("recv_due_idx").on(t.dueAt)
  ]
)

export type Invoice = typeof invoices.$inferSelect
export type Payment = typeof payments.$inferSelect
export type PaymentAttempt = typeof paymentAttempts.$inferSelect
export type CashierShift = typeof cashierShifts.$inferSelect
