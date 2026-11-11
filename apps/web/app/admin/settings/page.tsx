"use client"

import { useEffect, useState } from "react"

type Flag = { id: string; key: string; enabled: boolean }

export default function SettingsPage() {
  const [flags, setFlags] = useState<Flag[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    const res = await fetch("/api/admin/feature-flags", { cache: "no-store" })
    if (!res.ok) {
      setError(String(res.status))
      return
    }
    const data = await res.json()
    setFlags(data.flags ?? [])
  }
  useEffect(() => {
    void load()
  }, [])

  async function toggle(key: string, enabled: boolean) {
    setSaving(key)
    const res = await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled })
    })
    setSaving(null)
    if (!res.ok) {
      setError("save_failed")
      return
    }
    await load()
  }

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!flags) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Pengaturan & Feature Flag</h1>
      <section className="mt-6">
        <h2 className="text-sm font-medium">Feature flags</h2>
        {flags.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada flag.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {flags.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded border border-border p-3 text-sm"
              >
                <span className="font-mono">{f.key}</span>
                <button
                  onClick={() => toggle(f.key, !f.enabled)}
                  disabled={saving === f.key}
                  className="rounded border border-border px-3 py-1 text-xs"
                >
                  {saving === f.key
                    ? "…"
                    : f.enabled
                      ? "Aktif (klik matikan)"
                      : "Nonaktif (klik aktifkan)"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Pengaturan branding/penomoran/pajak lanjutan akan ditambahkan di modul berikutnya;
          atribusi PETORA INDONESIA wajib tetap tampil.
        </p>
      </section>
      <footer className="mt-12 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
