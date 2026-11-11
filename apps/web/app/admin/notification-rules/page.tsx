"use client"

import { useEffect, useState } from "react"

type Rule = {
  id: string
  eventKey: string
  channel: string
  templateKey: string
  audience: string
  audienceRef: string | null
  enabled: boolean
}

export default function NotificationRulesPage() {
  const [rules, setRules] = useState<Rule[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/notification-rules", { cache: "no-store" })
    if (!res.ok) {
      setError(String(res.status))
      return
    }
    setRules((await res.json()).rules ?? [])
  }
  useEffect(() => {
    void load()
  }, [])

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/admin/notification-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventKey: String(form.get("eventKey") || ""),
        channel: String(form.get("channel") || "whatsapp"),
        templateKey: String(form.get("templateKey") || ""),
        audience: String(form.get("audience") || "customer"),
        audienceRef: form.get("audienceRef") ? String(form.get("audienceRef")) : null,
        enabled: true
      })
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || "save_failed")
      return
    }
    ;(e.target as HTMLFormElement).reset()
    await load()
  }

  async function remove(id: string) {
    if (!confirm("Hapus rule ini?")) return
    setSaving(true)
    const res = await fetch("/api/admin/notification-rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    setSaving(false)
    if (!res.ok) setError("delete_failed")
    else await load()
  }

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!rules) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Aturan Notifikasi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pemetaan event → kanal → template (audience: customer/staff_role/owner). Pemanggilan via{" "}
        <code>dispatchNotificationEvent</code> dari service layer.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-medium">Rules ({rules.length})</h2>
        <ul className="mt-2 space-y-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded border border-border p-3 text-sm"
            >
              <div>
                <span className="font-mono">{r.eventKey}</span> → {r.channel} /{" "}
                <span className="font-mono">{r.templateKey}</span> · {r.audience}
                {r.audienceRef ? `:${r.audienceRef}` : ""}
              </div>
              <button
                disabled={saving}
                onClick={() => remove(r.id)}
                className="text-xs text-red-700"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded border border-border p-4">
        <h2 className="text-sm font-medium">Tambah Rule</h2>
        <form onSubmit={onSave} className="mt-3 max-w-xl space-y-2">
          <input
            name="eventKey"
            required
            placeholder="eventKey (mis. invoice.issued)"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              name="channel"
              defaultValue="whatsapp"
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="whatsapp">whatsapp</option>
              <option value="email">email</option>
              <option value="inbox">inbox</option>
            </select>
            <select
              name="audience"
              defaultValue="customer"
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="customer">customer</option>
              <option value="staff_role">staff_role</option>
              <option value="owner">owner</option>
            </select>
          </div>
          <input
            name="templateKey"
            required
            placeholder="templateKey"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="audienceRef"
            placeholder="audienceRef (opsional)"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={saving}
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Simpan rule"}
          </button>
          {error && error !== "401" && error !== "403" ? (
            <p className="text-sm text-red-600">Gagal: {error}</p>
          ) : null}
        </form>
      </section>
      <footer className="mt-12 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
