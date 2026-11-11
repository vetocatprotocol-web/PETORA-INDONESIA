"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Status = {
  initialized: boolean
  hasOrganization: boolean
  hasOwner: boolean
  available?: boolean
}

export default function SetupPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/setup/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s)
        if (s.initialized) router.replace("/")
      })
      .catch(() =>
        setStatus({ initialized: false, hasOrganization: false, hasOwner: false, available: false })
      )
  }, [router])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      organizationName: String(form.get("organizationName") || ""),
      branchName: String(form.get("branchName") || ""),
      timezone: String(form.get("timezone") || "Asia/Jakarta"),
      locale: String(form.get("locale") || "id"),
      ownerName: String(form.get("ownerName") || ""),
      ownerEmail: String(form.get("ownerEmail") || ""),
      ownerPassword: String(form.get("ownerPassword") || "")
    }
    try {
      const res = await fetch("/api/setup/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "setup_failed")
        return
      }
      router.replace("/")
      router.refresh()
    } catch {
      setError("network_error")
    } finally {
      setSubmitting(false)
    }
  }

  if (!status) {
    return <main className="mx-auto max-w-xl p-8">Memuat status instalasi…</main>
  }
  if (status.initialized) {
    return <main className="mx-auto max-w-xl p-8">Instalasi sudah selesai. Mengalihkan…</main>
  }
  if (status.available === false) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-semibold">Layanan belum siap</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Database atau layanan inti belum tersedia. Coba lagi setelah init selesai.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Setup Wizard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lengkapi data awal untuk memulai instalasi baru.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Organisasi &amp; Cabang</legend>
          <input
            name="organizationName"
            required
            minLength={2}
            placeholder="Nama organisasi"
            className="w-full rounded border border-border bg-background px-3 py-2"
          />
          <input
            name="branchName"
            required
            minLength={2}
            placeholder="Nama cabang pertama"
            className="w-full rounded border border-border bg-background px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              name="locale"
              defaultValue="id"
              className="rounded border border-border bg-background px-3 py-2"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
            <input
              name="timezone"
              defaultValue="Asia/Jakarta"
              placeholder="Zona waktu"
              className="rounded border border-border bg-background px-3 py-2"
            />
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Akun Owner</legend>
          <input
            name="ownerName"
            required
            minLength={2}
            placeholder="Nama owner"
            className="w-full rounded border border-border bg-background px-3 py-2"
          />
          <input
            name="ownerEmail"
            type="email"
            placeholder="Email owner (opsional)"
            className="w-full rounded border border-border bg-background px-3 py-2"
          />
          <input
            name="ownerPassword"
            type="password"
            required
            minLength={12}
            placeholder="Password (min 12 karakter)"
            className="w-full rounded border border-border bg-background px-3 py-2"
          />
        </fieldset>
        {error ? <p className="text-sm text-red-600">Gagal: {error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Menyimpan…" : "Selesaikan setup"}
        </button>
      </form>
      <p className="mt-8 text-xs text-muted-foreground">
        © PETORA INDONESIA. Atribusi ini wajib ditampilkan.
      </p>
    </main>
  )
}
