import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"

export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key]
    return v === null || v === undefined ? "" : String(v)
  })
}

export type UpsertMessageTemplateInput = {
  organizationId: string
  key: string
  channel: "whatsapp" | "email" | "inbox"
  lang?: string
  subject?: string | null
  body: string
  variables?: string[]
}

export async function listMessageTemplates(db: Database, organizationId: string) {
  return db
    .select()
    .from(schema.messageTemplates)
    .where(
      and(
        eq(schema.messageTemplates.organizationId, organizationId),
        isNull(schema.messageTemplates.deletedAt)
      )
    )
    .orderBy(schema.messageTemplates.key)
}

export async function upsertMessageTemplate(db: Database, input: UpsertMessageTemplateInput) {
  const lang = input.lang ?? "id"
  const existing = await db
    .select({ id: schema.messageTemplates.id })
    .from(schema.messageTemplates)
    .where(
      and(
        eq(schema.messageTemplates.organizationId, input.organizationId),
        eq(schema.messageTemplates.key, input.key.trim()),
        eq(schema.messageTemplates.channel, input.channel),
        eq(schema.messageTemplates.lang, lang),
        isNull(schema.messageTemplates.deletedAt)
      )
    )
    .limit(1)

  if (existing[0]) {
    const [row] = await db
      .update(schema.messageTemplates)
      .set({
        subject: input.subject ?? null,
        body: input.body,
        variables: (input.variables ?? []) as never,
        updatedAt: new Date()
      })
      .where(eq(schema.messageTemplates.id, existing[0].id))
      .returning()
    return row
  }

  const [row] = await db
    .insert(schema.messageTemplates)
    .values({
      organizationId: input.organizationId,
      key: input.key.trim(),
      channel: input.channel,
      lang,
      subject: input.subject ?? null,
      body: input.body,
      variables: (input.variables ?? []) as never
    })
    .returning()
  return row
}

export async function deleteMessageTemplate(
  db: Database,
  organizationId: string,
  id: string
): Promise<boolean> {
  const rows = await db
    .update(schema.messageTemplates)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.messageTemplates.id, id),
        eq(schema.messageTemplates.organizationId, organizationId),
        isNull(schema.messageTemplates.deletedAt)
      )
    )
    .returning({ id: schema.messageTemplates.id })
  return rows.length > 0
}

export type UpsertNotificationRuleInput = {
  organizationId: string
  eventKey: string
  channel: "whatsapp" | "email" | "inbox"
  templateKey: string
  audience: "customer" | "staff_role" | "owner"
  audienceRef?: string | null
  enabled?: boolean
  quietHours?: unknown
}

export async function listNotificationRules(db: Database, organizationId: string) {
  return db
    .select()
    .from(schema.notificationRules)
    .where(eq(schema.notificationRules.organizationId, organizationId))
    .orderBy(schema.notificationRules.eventKey)
}

export async function upsertNotificationRule(db: Database, input: UpsertNotificationRuleInput) {
  const existing = await db
    .select({ id: schema.notificationRules.id })
    .from(schema.notificationRules)
    .where(
      and(
        eq(schema.notificationRules.organizationId, input.organizationId),
        eq(schema.notificationRules.eventKey, input.eventKey.trim()),
        eq(schema.notificationRules.channel, input.channel),
        eq(schema.notificationRules.templateKey, input.templateKey.trim())
      )
    )
    .limit(1)

  if (existing[0]) {
    const [row] = await db
      .update(schema.notificationRules)
      .set({
        audience: input.audience,
        audienceRef: input.audienceRef ?? null,
        enabled: input.enabled ?? true,
        quietHours: (input.quietHours ?? null) as never,
        updatedAt: new Date()
      })
      .where(eq(schema.notificationRules.id, existing[0].id))
      .returning()
    return row
  }

  const [row] = await db
    .insert(schema.notificationRules)
    .values({
      organizationId: input.organizationId,
      eventKey: input.eventKey.trim(),
      channel: input.channel,
      templateKey: input.templateKey.trim(),
      audience: input.audience,
      audienceRef: input.audienceRef ?? null,
      enabled: input.enabled ?? true,
      quietHours: (input.quietHours ?? null) as never
    })
    .returning()
  return row
}

export async function deleteNotificationRule(
  db: Database,
  organizationId: string,
  id: string
): Promise<boolean> {
  const rows = await db
    .delete(schema.notificationRules)
    .where(
      and(
        eq(schema.notificationRules.id, id),
        eq(schema.notificationRules.organizationId, organizationId)
      )
    )
    .returning({ id: schema.notificationRules.id })
  return rows.length > 0
}

export type DispatchInput = {
  organizationId: string
  eventKey: string
  vars?: Record<string, string | number | null | undefined>
  to?: string | null // destination for outbound (phone/email)
  userId?: string | null // for inbox
  connectionId?: string | null
  subject?: string | null
  relatedType?: string | null
  relatedId?: string | null
  lang?: string
}

export async function dispatchNotificationEvent(
  db: Database,
  input: DispatchInput
): Promise<{ queued: number; inbox: number }> {
  const rules = await db
    .select()
    .from(schema.notificationRules)
    .where(
      and(
        eq(schema.notificationRules.organizationId, input.organizationId),
        eq(schema.notificationRules.eventKey, input.eventKey),
        eq(schema.notificationRules.enabled, true)
      )
    )

  let queued = 0
  let inbox = 0
  const lang = input.lang ?? "id"
  const vars = input.vars ?? {}

  for (const rule of rules) {
    const [tmpl] = await db
      .select()
      .from(schema.messageTemplates)
      .where(
        and(
          eq(schema.messageTemplates.organizationId, input.organizationId),
          eq(schema.messageTemplates.key, rule.templateKey),
          eq(schema.messageTemplates.channel, rule.channel),
          eq(schema.messageTemplates.lang, lang),
          isNull(schema.messageTemplates.deletedAt)
        )
      )
      .limit(1)
    const body = renderTemplate(tmpl?.body ?? `{{event}}`, { ...vars, event: input.eventKey })
    const subject = tmpl?.subject ? renderTemplate(tmpl.subject, vars) : (input.subject ?? null)

    if (rule.channel === "inbox") {
      if (input.userId) {
        await db.insert(schema.notificationInbox).values({
          userId: input.userId,
          title: subject || input.eventKey,
          body,
          link: typeof vars.link === "string" ? vars.link : null
        })
        inbox++
      }
      continue
    }

    if (input.to) {
      await db.insert(schema.outboundMessages).values({
        organizationId: input.organizationId,
        channel: rule.channel as "whatsapp" | "email",
        connectionId: input.connectionId ?? null,
        to: input.to,
        templateKey: rule.templateKey,
        content: body,
        status: "queued",
        attempts: 0,
        relatedType: input.relatedType ?? null,
        relatedId: (input.relatedId as never) ?? null
      })
      queued++
    }
  }
  return { queued, inbox }
}
