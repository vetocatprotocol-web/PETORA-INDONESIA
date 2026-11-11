import { findSession } from "@petora/auth"
import type { NextRequest } from "next/server"
import { getAuthRuntime, type AuthRealm } from "./auth-runtime"

export function parseAuthRealm(value: string): AuthRealm | null {
  return value === "staff" || value === "customer" ? value : null
}

export function sessionCookieName(realm: AuthRealm): string {
  return `petora_${realm}_session`
}

export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const forwardedIp = forwardedFor?.split(",").at(-1)?.trim()
  const ip = forwardedIp || request.headers.get("x-real-ip")?.trim()
  return ip && ip.length <= 128 ? ip : null
}

export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",").at(-1)?.trim()
  const host = forwardedHost || request.headers.get("host")
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",").at(-1)?.trim()
  const protocol = forwardedProtocol || new URL(request.url).protocol.replace(":", "")
  if (!host || (protocol !== "http" && protocol !== "https")) return false

  try {
    return new URL(origin).origin === `${protocol}://${host}`
  } catch {
    return false
  }
}

export async function resolveRequestSession(request: NextRequest, realm: AuthRealm) {
  const token = request.cookies.get(sessionCookieName(realm))?.value
  if (!token) return null

  const { db } = getAuthRuntime()
  return findSession(db, token, realm)
}
