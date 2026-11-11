import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"

export type NextDocumentNumberInput = {
  organizationId: string
  branchId?: string | null
  docType: string
  period: string
  pattern: string
  branchCode?: string
}

function formatNumber(pattern: string, ctx: Record<string, string>): string {
  return pattern.replace(/\{([A-Z0-9_]+)(?::(\d+))?\}/g, (_m, key: string, pad?: string) => {
    const val = ctx[key] ?? ""
    if (pad) return val.padStart(Number(pad), "0")
    return val
  })
}

export async function nextDocumentNumber(
  db: Database,
  input: NextDocumentNumberInput
): Promise<string> {
  const now = new Date()
  return db.transaction(async (tx) => {
    const where = and(
      eq(schema.documentSequences.organizationId, input.organizationId),
      eq(schema.documentSequences.docType, input.docType),
      eq(schema.documentSequences.period, input.period),
      input.branchId
        ? eq(schema.documentSequences.branchId, input.branchId)
        : isNull(schema.documentSequences.branchId)
    )

    const existing = await tx
      .select({
        id: schema.documentSequences.id,
        lastSeq: schema.documentSequences.lastSeq
      })
      .from(schema.documentSequences)
      .where(where)
      .limit(1)

    let seq: number
    let id: string
    if (existing[0]) {
      seq = Number(existing[0].lastSeq) + 1
      id = existing[0].id
      await tx
        .update(schema.documentSequences)
        .set({ lastSeq: seq, pattern: input.pattern, updatedAt: now })
        .where(eq(schema.documentSequences.id, id))
    } else {
      seq = 1
      const inserted = await tx
        .insert(schema.documentSequences)
        .values({
          organizationId: input.organizationId,
          branchId: input.branchId ?? null,
          docType: input.docType,
          period: input.period,
          lastSeq: seq,
          pattern: input.pattern,
          updatedAt: now
        })
        .returning({ id: schema.documentSequences.id })
      id = inserted[0]!.id
      void id
    }

    return formatNumber(input.pattern, {
      BRANCH: input.branchCode ?? "",
      YYYY: input.period.slice(0, 4),
      MM: input.period.slice(4, 6),
      SEQ: String(seq)
    })
  })
}
