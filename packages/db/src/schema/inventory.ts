/**
 * Skema Drizzle — domain Inventori & Pengadaan (AGENT.md 13, docs/03-erd.md).
 * Fase 4: gudang, batch/expiry, ledger stok (single source of truth), PO, GRN, transfer, opname.
 * Aturan AGENT.md: kuantitas = integer; HPP bergerak (moving average) disimpan sebagai bigint per-unit ×1000.
 */
import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { id, timestamps, softDelete, rupiah } from "./helpers"
import { organization, branches, users } from "./core"
import { products, productVariants, suppliers } from "./master"

export const warehouses = pgTable(
  "warehouses",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isDefault: text("is_default").default("false").notNull(),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("wh_branch_code_idx").on(t.branchId, t.code)]
)

/** Batch/lot stok fisik dengan expiry & biaya per unit tersimpan (×1000 agar integer presisi). */
export const stockBatches = pgTable(
  "stock_batches",
  {
    id: id(),
    warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    batchNumber: text("batch_number"),
    expiryDate: date("expiry_date"),
    quantity: integer("quantity").default(0).notNull(),
    /** HPP per unit batch ini, Rupiah ×1000 (mis. Rp12.500,50 = 12500500). */
    unitCostMilli: integer("unit_cost_milli").default(0).notNull(),
    receivedFrom: text("received_from", { enum: ["grn", "transfer", "adjustment", "opening", "production"] }).default("opening").notNull(),
    ...timestamps()
  },
  (t) => [index("sb_wh_variant_idx").on(t.warehouseId, t.variantId), index("sb_expiry_idx").on(t.expiryDate)]
)

/** Ledger stok append-only — satu-satunya sumber kebenaran kuantitas (AGENT.md: tidak ada kolom cache yang di-update terpisah). */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    batchId: uuid("batch_id").references(() => stockBatches.id),
    /** Positif = masuk, negatif = keluar. */
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    unitCostMilli: integer("unit_cost_milli").default(0).notNull(),
    kind: text("kind", {
      enum: ["grn", "sale", "prescription", "return_customer", "return_supplier", "transfer_in", "transfer_out", "opname", "adjustment", "consumption", "opening"]
    }).notNull(),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index("sm_variant_created_idx").on(t.variantId, t.createdAt),
    index("sm_wh_variant_idx").on(t.warehouseId, t.variantId),
    index("sm_ref_idx").on(t.refType, t.refId),
    index("sm_branch_idx").on(t.branchId)
  ]
)

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    number: text("number").notNull(),
    status: text("status", { enum: ["draft", "pending_approval", "approved", "sent", "partial", "completed", "cancelled"] })
      .default("draft")
      .notNull(),
    expectedAt: date("expected_at"),
    totalAmount: rupiah("total_amount").default(0).notNull(),
    notes: text("notes"),
    approvedBy: uuid("approved_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps(),
    ...softDelete()
  },
  (t) => [uniqueIndex("po_org_number_idx").on(t.organizationId, t.number), index("po_status_idx").on(t.status), index("po_supplier_idx").on(t.supplierId)]
)

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: id(),
    poId: uuid("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    quantityOrdered: integer("quantity_ordered").notNull(),
    quantityReceived: integer("quantity_received").default(0).notNull(),
    unitPrice: rupiah("unit_price").notNull(),
    ...timestamps()
  },
  (t) => [index("poi_po_idx").on(t.poId)]
)

export const goodsReceipts = pgTable(
  "goods_receipts",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
    poId: uuid("po_id").references(() => purchaseOrders.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    number: text("number").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    totalAmount: rupiah("total_amount").default(0).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [uniqueIndex("gr_org_number_idx").on(t.organizationId, t.number), index("gr_po_idx").on(t.poId)]
)

export const goodsReceiptItems = pgTable(
  "goods_receipt_items",
  {
    id: id(),
    grnId: uuid("grn_id").notNull().references(() => goodsReceipts.id, { onDelete: "cascade" }),
    poItemId: uuid("po_item_id").references(() => purchaseOrderItems.id),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    batchId: uuid("batch_id").references(() => stockBatches.id),
    quantity: integer("quantity").notNull(),
    unitCost: rupiah("unit_cost").notNull(),
    expiryDate: date("expiry_date"),
    batchNumber: text("batch_number"),
    ...timestamps()
  },
  (t) => [index("gri_grn_idx").on(t.grnId)]
)

/** Retur ke supplier — mengurangi stok, membuat payables credit. */
export const supplierReturns = pgTable(
  "supplier_returns",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    grnId: uuid("grn_id").references(() => goodsReceipts.id),
    number: text("number").notNull(),
    reason: text("reason").notNull(),
    totalAmount: rupiah("total_amount").default(0).notNull(),
    status: text("status", { enum: ["draft", "approved", "posted", "cancelled"] }).default("draft").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [uniqueIndex("sr_org_number_idx").on(t.organizationId, t.number)]
)

export const supplierReturnItems = pgTable(
  "supplier_return_items",
  {
    id: id(),
    returnId: uuid("return_id").notNull().references(() => supplierReturns.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    batchId: uuid("batch_id").references(() => stockBatches.id),
    quantity: integer("quantity").notNull(),
    unitCost: rupiah("unit_cost").notNull(),
    ...timestamps()
  },
  (t) => [index("sri_return_idx").on(t.returnId)]
)

export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    fromBranchId: uuid("from_branch_id").notNull().references(() => branches.id),
    toBranchId: uuid("to_branch_id").notNull().references(() => branches.id),
    fromWarehouseId: uuid("from_warehouse_id").notNull().references(() => warehouses.id),
    toWarehouseId: uuid("to_warehouse_id").notNull().references(() => warehouses.id),
    number: text("number").notNull(),
    status: text("status", { enum: ["draft", "in_transit", "received", "cancelled"] }).default("draft").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [uniqueIndex("st_org_number_idx").on(t.organizationId, t.number), index("st_status_idx").on(t.status)]
)

export const stockTransferItems = pgTable(
  "stock_transfer_items",
  {
    id: id(),
    transferId: uuid("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    batchId: uuid("batch_id").references(() => stockBatches.id),
    quantity: integer("quantity").notNull(),
    ...timestamps()
  },
  (t) => [index("sti_transfer_idx").on(t.transferId)]
)

/** Stock opname (count) — menghasilkan movement penyesuaian saat di-post. */
export const stockOpnames = pgTable(
  "stock_opnames",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    branchId: uuid("branch_id").notNull().references(() => branches.id),
    warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
    number: text("number").notNull(),
    status: text("status", { enum: ["draft", "counted", "posted", "cancelled"] }).default("draft").notNull(),
    countedBy: uuid("counted_by").references(() => users.id),
    postedBy: uuid("posted_by").references(() => users.id),
    ...timestamps()
  },
  (t) => [uniqueIndex("so_org_number_idx").on(t.organizationId, t.number)]
)

export const stockOpnameLines = pgTable(
  "stock_opname_lines",
  {
    id: id(),
    opnameId: uuid("opname_id").notNull().references(() => stockOpnames.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    batchId: uuid("batch_id").references(() => stockBatches.id),
    systemQty: integer("system_qty").notNull(),
    countedQty: integer("counted_qty"),
    difference: integer("difference"),
    ...timestamps()
  },
  (t) => [index("sol_opname_idx").on(t.opnameId)]
)

/** Bundel/resep rakitan: komponen produk → produk jadi (mis. paket vitamin). */
export const bundles = pgTable(
  "bundles",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organization.id),
    productId: uuid("product_id").notNull().references(() => products.id),
    componentVariantId: uuid("component_variant_id").notNull().references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    ...timestamps()
  },
  (t) => [index("bundle_product_idx").on(t.productId)]
)

export type Warehouse = typeof warehouses.$inferSelect
export type StockMovement = typeof stockMovements.$inferSelect
export type PurchaseOrder = typeof purchaseOrders.$inferSelect
