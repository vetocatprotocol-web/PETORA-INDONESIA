"use client"

import { useEffect, useMemo, useState } from "react"

type Field = {
  key: string
  label: string
  type: string
  required?: boolean
  secret?: boolean
  help?: string
}
type Adapter = {
  key: string
  category: string
  name: string
  configFields: Field[]
  credentialFields: Field[]
  supportsSandbox: boolean
}
type Connection = {
  id: string
  adapterKey: string
  name: string
  environment: string
  isActive: boolean
  hasCredentials: boolean
  config: Record<string, unknown>
  credentialFields: { key: string; stored: boolean }[]
  lastTestAt?: string | null
  lastTestOk?: boolean | null
}
type Route = {
  id: string
  purpose: string
  connectionId: string
  branchId: string | null
  connectionName: string
  adapterKey: string
}
type Branch = { id: string; name: string; code: string }

function FieldInput({ field, prefix }: { field: Field; prefix: "config" | "credentials" }) {
  const name = `${prefix}.${field.key}`
  const base = "w-full rounded border border-border bg-background px-3 py-2 text-sm"
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={name} value="true" /> {field.label}
      </label>
    )
  }
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">
        {field.label}
        {field.required ? " *" : ""}
        {field.secret ? " (rahasia)" : ""}
      </label>
      <input
        name={name}
        type={field.secret ? "password" : field.type === "number" ? "number" : "text"}
        placeholder={field.help || field.label}
        className={base}
        autoComplete={field.secret ? "new-password" : "off"}
      />
    </div>
  )
}

export default function IntegrationsAdminPage() {
  const [data, setData] = useState<{ adapters: Adapter[]; connections: Connection[] } | null>(null)
  const [routes, setRoutes] = useState<Route[] | null>(null)
  const [branches, setBranches] = useState<Branch[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [adapterKey, setAdapterKey] = useState("")

  async function load() {
    const [i, r, b] = await Promise.all([
      fetch("/api/admin/integrations", { cache: "no-store" }),
      fetch("/api/admin/integrations/routes", { cache: "no-store" }),
      fetch("/api/admin/branches", { cache: "no-store" })
    ])
    if ([i, r, b].some((x) => x.status === 401 || x.status === 403)) {
      setError("403")
      return
    }
    if (!i.ok || !r.ok || !b.ok) {
      setError("load_failed")
      return
    }
    setData(await i.json())
    setRoutes((await r.json()).routes ?? [])
    setBranches((await b.json()).branches ?? [])
  }
  useEffect(() => {
    void load()
  }, [])

  const selected = useMemo(
    () => data?.adapters.find((a) => a.key === adapterKey) ?? null,
    [data, adapterKey]
  )

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!data) return
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const config: Record<string, unknown> = {}
    const credentials: Record<string, unknown> = {}
    for (const [k, v] of form.entries()) {
      if (k.startsWith("config.")) {
        const key = k.slice("config.".length)
        if (v === "true") config[key] = true
        else if (String(v).trim() !== "") config[key] = String(v)
      }
      if (k.startsWith("credentials.")) {
        const key = k.slice("credentials.".length)
        if (String(v).trim() !== "") credentials[key] = String(v)
      }
    }
    for (const f of selected?.configFields ?? []) {
      if (f.type === "boolean" && !(f.key in config)) config[f.key] = false
    }
    const res = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adapterKey: String(form.get("adapterKey") || ""),
        name: String(form.get("name") || ""),
        environment: String(form.get("environment") || "sandbox"),
        isActive: form.get("isActive") === "true",
        config,
        credentials
      })
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || "create_failed")
      return
    }
    ;(e.target as HTMLFormElement).reset()
    setAdapterKey("")
    await load()
  }

  async function testConnection(id: string) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/integrations/${id}/test`, { method: "POST" })
    setSaving(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(j.error || "test_failed")
      return
    }
    const r = j.result
    alert(
      r?.ok
        ? `OK: ${r.note}`
        : `Belum lengkap: ${(r?.missingConfig || []).concat(r?.missingCredentials || []).join(", ") || r?.note || "gagal"}`
    )
    await load()
  }

  async function sendTest(id: string, adapterKey: string) {
    const isEmail = adapterKey === "resend"
    const to = prompt(
      isEmail ? "Alamat email tujuan uji:" : "Nomor WhatsApp tujuan uji (format internasional):"
    )
    if (!to) return
    const content = prompt("Isi pesan uji:", "Pesan uji dari PETORA INDONESIA.") || ""
    if (!content.trim()) return
    const subject = isEmail
      ? prompt("Subjek email (opsional):", "Uji Integrasi PETORA") || undefined
      : undefined
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/integrations/${id}/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, content, ...(subject ? { subject } : {}) })
    })
    setSaving(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(`Gagal: ${j.error || res.status}`)
      return
    }
    const r = j.result
    alert(
      r?.ok
        ? `Terkirim (${r.channel})${r.providerMessageId ? ` · id: ${r.providerMessageId}` : ""}`
        : `Gagal kirim: ${r?.error || "unknown"}`
    )
  }

  async function toggle(id: string, isActive: boolean) {
    setSaving(true)
    const res = await fetch(`/api/admin/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive })
    })
    setSaving(false)
    if (!res.ok) setError("update_failed")
    else await load()
  }

  async function remove(id: string) {
    if (!confirm("Hapus koneksi ini?")) return
    setSaving(true)
    const res = await fetch(`/api/admin/integrations/${id}`, { method: "DELETE" })
    setSaving(false)
    if (!res.ok) setError("delete_failed")
    else await load()
  }

  async function onRoute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const branchId = String(form.get("branchId") || "")
    const res = await fetch("/api/admin/integrations/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: String(form.get("purpose") || ""),
        connectionId: String(form.get("connectionId") || ""),
        branchId: branchId || null
      })
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || "route_failed")
      return
    }
    ;(e.target as HTMLFormElement).reset()
    await load()
  }

  async function deleteRoute(routeId: string) {
    if (!confirm("Hapus routing ini?")) return
    setSaving(true)
    const res = await fetch("/api/admin/integrations/routes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeId })
    })
    setSaving(false)
    if (!res.ok) setError("delete_route_failed")
    else await load()
  }

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!data || !routes || !branches) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Integrasi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kelola koneksi, routing, dan uji kirim. Kredensial terenkripsi (AES-256-GCM), tidak pernah
        ditampilkan kembali.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Koneksi tersimpan</h2>
        {data.connections.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada koneksi.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.connections.map((c) => (
              <li key={c.id} className="rounded border border-border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {c.name} <span className="text-muted-foreground">({c.adapterKey})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.environment} · {c.isActive ? "aktif" : "nonaktif"} · kredensial:{" "}
                      {c.hasCredentials ? "tersimpan" : "belum"}
                      {c.lastTestAt ? (
                        <span>
                          {" "}
                          · tes: {c.lastTestOk ? "OK" : "gagal"} (
                          {new Date(c.lastTestAt).toLocaleString()})
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={saving}
                      onClick={() => testConnection(c.id)}
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Uji
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => sendTest(c.id, c.adapterKey)}
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      Kirim uji
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => toggle(c.id, !c.isActive)}
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      {c.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => remove(c.id)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Routing integrasi (purpose → koneksi)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tentukan koneksi default per tujuan (mis. <code>whatsapp.otp</code>,{" "}
          <code>email.receipt</code>, <code>payment.default</code>). Opsional per cabang.
        </p>
        {routes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada routing.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {routes.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded border border-border p-2"
              >
                <div>
                  <span className="font-mono text-xs">{r.purpose}</span> → {r.connectionName}{" "}
                  <span className="text-muted-foreground">({r.adapterKey})</span>
                  <span className="text-xs text-muted-foreground">
                    {r.branchId
                      ? ` · cabang: ${branches.find((b) => b.id === r.branchId)?.code || r.branchId.slice(0, 8)}`
                      : " · semua cabang"}
                  </span>
                </div>
                <button
                  disabled={saving}
                  onClick={() => deleteRoute(r.id)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={onRoute} className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-4">
          <input
            name="purpose"
            required
            placeholder="purpose (mis. whatsapp.otp)"
            className="rounded border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            name="connectionId"
            required
            className="rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Koneksi…</option>
            {data.connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.adapterKey})
              </option>
            ))}
          </select>
          <select
            name="branchId"
            className="rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Semua cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          <button
            disabled={saving}
            className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-4 sm:w-fit"
          >
            Simpan routing
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Tambah koneksi</h2>
        <form onSubmit={onCreate} className="mt-3 max-w-xl space-y-3">
          <select
            name="adapterKey"
            required
            value={adapterKey}
            onChange={(e) => setAdapterKey(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Pilih adapter…</option>
            {data.adapters.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name} ({a.category})
              </option>
            ))}
          </select>
          <input
            name="name"
            required
            placeholder="Nama koneksi"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              name="environment"
              defaultValue="sandbox"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" value="true" /> Aktifkan
            </label>
          </div>
          {selected && selected.configFields.length > 0 ? (
            <fieldset className="space-y-2 rounded border border-border p-3">
              <legend className="px-1 text-xs font-medium">Konfigurasi</legend>
              {selected.configFields.map((f) => (
                <FieldInput key={f.key} field={f} prefix="config" />
              ))}
            </fieldset>
          ) : null}
          {selected && selected.credentialFields.length > 0 ? (
            <fieldset className="space-y-2 rounded border border-border p-3">
              <legend className="px-1 text-xs font-medium">Kredensial (terenkripsi)</legend>
              {selected.credentialFields.map((f) => (
                <FieldInput key={f.key} field={f} prefix="credentials" />
              ))}
            </fieldset>
          ) : null}
          <button
            disabled={saving}
            type="submit"
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Buat koneksi"}
          </button>
          {error && error !== "401" && error !== "403" ? (
            <p className="text-sm text-red-600">Gagal: {error}</p>
          ) : null}
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          &quot;Kirim uji&quot; mengirim langsung via adapter dan mencatat ke outbound log. Tes live
          provider, verifikasi signature webhook, dan handler bisnis menyusul.
        </p>
      </section>
      <footer className="mt-12 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
