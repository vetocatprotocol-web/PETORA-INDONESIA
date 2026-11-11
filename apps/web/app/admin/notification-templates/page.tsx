"use client"

import { useEffect, useState } from "react"

type Template = {
  id: string
  key: string
  channel: string
  lang: string
  subject: string | null
  body: string
  variables: string[] | null
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/notification-templates", { cache: "no-store" })
    if (!res.ok) {
      setError(String(res.status))
      return
    }
    setTemplates((await res.json()).templates ?? [])
  }
  useEffect(() => {
    void load()
  }, [])

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/admin/notification-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: String(form.get("key") || ""),
        channel: String(form.get("channel") || "whatsapp"),
        lang: String(form.get("lang") || "id"),
        subject: form.get("subject") ? String(form.get("subject")) : null,
        body: String(form.get("body") || ""),
        variables: []
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
    if (!confirm("Hapus template ini?")) return
    setSaving(true)
    const res = await fetch(`/api/admin/notification-templates/${id}`, { method: "DELETE" })
    setSaving(false)
    if (!res.ok) setError("delete_failed")
    else await load()
  }

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!templates) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Template Notifikasi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kelola template pesan per kanal/bahasa. Variabel: <code>{"{{nama}}"}</code>,{" "}
        <code>{"{{total}}"}</code>, dll. (render dasar tersedia).
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-medium">Template ({templates.length})</h2>
        <ul className="mt-2 space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono">{t.key}</span> · {t.channel} · {t.lang}
                </div>
                <button
                  disabled={saving}
                  onClick={() => remove(t.id)}
                  className="text-xs text-red-700"
                >
                  Hapus
                </button>
              </div>
              {t.subject ? (
                <div className="mt-1 text-xs text-muted-foreground">Subjek: {t.subject}</div>
              ) : null}
              <pre className="mt-2 whitespace-pre-wrap text-xs">{t.body}</pre>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded border border-border p-4">
        <h2 className="text-sm font-medium">Tambah/Perbarui Template</h2>
        <form onSubmit={onSave} className="mt-3 max-w-xl space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input
              name="key"
              required
              placeholder="key (mis. receipt.whatsapp)"
              className="col-span-2 rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              name="lang"
              defaultValue="id"
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="id">id</option>
              <option value="en">en</option>
            </select>
          </div>
          <select
            name="channel"
            defaultValue="whatsapp"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="whatsapp">whatsapp</option>
            <option value="email">email</option>
            <option value="inbox">inbox</option>
          </select>
          <input
            name="subject"
            placeholder="Subjek (opsional, untuk email/inbox)"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            name="body"
            required
            rows={6}
            placeholder="Isi pesan. Gunakan {{variabel}}"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={saving}
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Simpan template"}
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
