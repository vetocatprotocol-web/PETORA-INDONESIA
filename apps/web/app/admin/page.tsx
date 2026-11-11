import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createDb } from "@petora/db"
import { findSession } from "@petora/auth"

export const dynamic = "force-dynamic"

const links = [
  { href: "/admin/branches", label: "Cabang" },
  { href: "/admin/roles", label: "Role & Hak Akses" },
  { href: "/admin/users", label: "Pengguna & Penugasan Role" },
  { href: "/admin/integrations", label: "Integrasi" },
  { href: "/admin/notification-templates", label: "Template Notifikasi" },
  { href: "/admin/notification-rules", label: "Aturan Notifikasi" },
  { href: "/admin/settings", label: "Pengaturan & Feature Flag" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/security", label: "Keamanan (2FA)" }
]

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("petora_staff_session")?.value
  const databaseUrl = process.env.DATABASE_URL
  if (!token || !databaseUrl) redirect("/")
  const db = createDb(databaseUrl)
  try {
    const session = await findSession(db, token, "staff")
    if (!session) redirect("/")
  } finally {
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
  }
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Panel pengaturan platform inti.</p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              className="block rounded border border-border p-3 text-sm hover:bg-muted"
              href={l.href}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <footer className="mt-12 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
