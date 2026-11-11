import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createDb } from "@petora/db"
import { getSetupStatus, initializeSetup } from "@petora/core"
import { createSession } from "@petora/auth"
import { hasSameOrigin } from "../../../../lib/auth-api"

export const runtime = "nodejs"

const bodySchema = z
  .object({
    organizationName: z.string().trim().min(2).max(120),
    organizationCode: z.string().trim().max(20).optional(),
    branchName: z.string().trim().min(2).max(120),
    branchCode: z.string().trim().max(20).optional(),
    branchAddress: z.string().trim().max(500).optional(),
    branchContact: z.string().trim().max(120).optional(),
    timezone: z.string().trim().max(64).optional(),
    locale: z.enum(["id", "en"]).optional(),
    ownerName: z.string().trim().min(2).max(120),
    ownerEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
    ownerPhone: z.string().trim().max(32).optional().or(z.literal("")),
    ownerPassword: z.string().min(12).max(1024)
  })
  .strict()

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 })

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return NextResponse.json({ error: "unavailable" }, { status: 503 })

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success)
    return NextResponse.json(
      { error: "invalid_request", issues: body.error.flatten() },
      { status: 400 }
    )

  const db = createDb(databaseUrl)
  try {
    const status = await getSetupStatus(db)
    if (status.initialized)
      return NextResponse.json({ error: "already_initialized" }, { status: 409 })

    const result = await initializeSetup(db, {
      ...body.data,
      ownerEmail: body.data.ownerEmail || undefined,
      ownerPhone: body.data.ownerPhone || undefined
    })

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000)
    const session = await createSession(db, {
      userId: result.ownerUserId,
      realm: "staff",
      expiresAt,
      ip: request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || undefined,
      userAgent: request.headers.get("user-agent")?.slice(0, 512) || undefined
    })

    const response = NextResponse.json({ ok: true, ...result }, { status: 201 })
    response.headers.set("Cache-Control", "no-store")
    response.cookies.set("petora_staff_session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "setup_failed"
    if (message === "Setup already completed") {
      return NextResponse.json({ error: "already_initialized" }, { status: 409 })
    }
    return NextResponse.json({ error: "setup_failed" }, { status: 500 })
  } finally {
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
  }
}
