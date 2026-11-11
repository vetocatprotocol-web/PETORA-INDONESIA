import { and, eq, isNull } from "drizzle-orm"
import type { Database } from "@petora/db"
import { schema } from "@petora/db"
import { getDecryptedCredentials } from "./connections"

export type SendResult = { ok: true; providerMessageId?: string } | { ok: false; error: string }

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

async function sendResend(
  config: Record<string, unknown>,
  creds: Record<string, unknown>,
  to: string,
  subject: string,
  content: string
): Promise<SendResult> {
  const apiKey = asString(creds.api_key)
  const fromEmail = asString(config.from_email)
  const fromName = asString(config.from_name)
  if (!apiKey || !fromEmail) return { ok: false, error: "missing_resend_config" }
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: content,
      text: content.replace(/<[^>]+>/g, "")
    })
  })
  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    message?: string
    name?: string
  }
  if (!res.ok) return { ok: false, error: data.message || data.name || `http_${res.status}` }
  return { ok: true, providerMessageId: data.id }
}

async function sendWhatsAppCloud(
  config: Record<string, unknown>,
  creds: Record<string, unknown>,
  to: string,
  content: string
): Promise<SendResult> {
  const token = asString(creds.access_token)
  const phoneNumberId = asString(config.phone_number_id)
  if (!token || !phoneNumberId) return { ok: false, error: "missing_whatsapp_cloud_config" }
  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: content }
    })
  })
  const data = (await res.json().catch(() => ({}))) as {
    messages?: { id?: string }[]
    error?: { message?: string }
  }
  if (!res.ok) return { ok: false, error: data.error?.message || `http_${res.status}` }
  return { ok: true, providerMessageId: data.messages?.[0]?.id }
}

async function sendWhatsAppGateway(
  config: Record<string, unknown>,
  creds: Record<string, unknown>,
  to: string,
  content: string
): Promise<SendResult> {
  const baseUrl = asString(config.base_url)?.replace(/\/+$/, "")
  const apiKey = asString(creds.api_key)
  if (!baseUrl || !apiKey) return { ok: false, error: "missing_whatsapp_gateway_config" }
  // Generic gateway payload (Fonnte-compatible shape); providers may vary.
  const deviceId = asString(config.device_id)
  const body: Record<string, unknown> = { target: to, message: content }
  if (deviceId) body.device = deviceId
  const res = await fetch(`${baseUrl}/send`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  const data = (await res.json().catch(() => ({}))) as {
    status?: boolean
    id?: string
    reason?: string
    message?: string
  }
  if (!res.ok || data.status === false) {
    return { ok: false, error: data.reason || data.message || `http_${res.status}` }
  }
  return { ok: true, providerMessageId: data.id }
}

export async function sendViaConnection(
  db: Database,
  connectionId: string,
  organizationId: string,
  encryptionKey: Buffer,
  message: { channel: "whatsapp" | "email"; to: string; subject?: string; content: string }
): Promise<SendResult> {
  const [conn] = await db
    .select()
    .from(schema.integrationConnections)
    .where(
      and(
        eq(schema.integrationConnections.id, connectionId),
        eq(schema.integrationConnections.organizationId, organizationId),
        isNull(schema.integrationConnections.deletedAt)
      )
    )
    .limit(1)
  if (!conn) return { ok: false, error: "connection_not_found" }
  if (!conn.isActive) return { ok: false, error: "connection_inactive" }
  if (!conn.credentialsEnc) return { ok: false, error: "missing_credentials" }

  let creds: Record<string, unknown>
  try {
    creds = (await getDecryptedCredentials(db, connectionId, organizationId, encryptionKey)) ?? {}
  } catch {
    return { ok: false, error: "decrypt_failed" }
  }
  const config = (conn.config ?? {}) as Record<string, unknown>

  if (message.channel === "email") {
    if (conn.adapterKey === "resend") {
      return sendResend(
        config,
        creds,
        message.to,
        message.subject || "Pesan dari PETORA",
        message.content
      )
    }
    return { ok: false, error: "unsupported_email_adapter" }
  }

  if (message.channel === "whatsapp") {
    if (conn.adapterKey === "whatsapp_cloud")
      return sendWhatsAppCloud(config, creds, message.to, message.content)
    if (conn.adapterKey === "whatsapp_gateway")
      return sendWhatsAppGateway(config, creds, message.to, message.content)
    return { ok: false, error: "unsupported_whatsapp_adapter" }
  }

  return { ok: false, error: "unsupported_channel" }
}

export async function processOutboundMessage(
  db: Database,
  outboundMessageId: string,
  encryptionKey: Buffer
): Promise<SendResult> {
  const [msg] = await db
    .select()
    .from(schema.outboundMessages)
    .where(eq(schema.outboundMessages.id, outboundMessageId))
    .limit(1)
  if (!msg) return { ok: false, error: "message_not_found" }
  if (msg.status === "sent" || msg.status === "cancelled") return { ok: true }

  await db
    .update(schema.outboundMessages)
    .set({ status: "sending", attempts: (msg.attempts ?? 0) + 1, updatedAt: new Date() })
    .where(eq(schema.outboundMessages.id, msg.id))

  if (!msg.connectionId) {
    await db
      .update(schema.outboundMessages)
      .set({ status: "failed", lastError: "no_connection", updatedAt: new Date() })
      .where(eq(schema.outboundMessages.id, msg.id))
    return { ok: false, error: "no_connection" }
  }

  const result = await sendViaConnection(db, msg.connectionId, msg.organizationId, encryptionKey, {
    channel: msg.channel as "whatsapp" | "email",
    to: msg.to,
    content: msg.content
  })

  if (result.ok) {
    await db
      .update(schema.outboundMessages)
      .set({
        status: "sent",
        sentAt: new Date(),
        lastError: null,
        providerMessageId: result.providerMessageId ?? null,
        updatedAt: new Date()
      })
      .where(eq(schema.outboundMessages.id, msg.id))
  } else {
    await db
      .update(schema.outboundMessages)
      .set({ status: "failed", lastError: result.error, updatedAt: new Date() })
      .where(eq(schema.outboundMessages.id, msg.id))
  }
  return result
}
