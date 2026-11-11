"use client"

import { useEffect, useState } from "react"

type Branch = { id: string; name: string; code: string; timezone: string; address?: string | null }

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/branches", { cache: "no-store" })
    if (!res.ok) {
      setError(String(res.status))
      return
    }
    const data = await res.json()
    setBranches(data.branches ?? [])
  }
  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/admin/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        code: String(form.get("code") || ""),
        timezone: String(form.get("timezone") || "Asia/Jakarta"),
        address: String(form.get("address") || "")
      })
    })
    setSaving(false)
    if (!res.ok) {
      setError("create_failed")
      return
    }
    ;(e.target as HTMLFormElement).reset()
    await load()
  }

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!branches) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Cabang</h1>
      <ul className="mt-6 space-y-2">
        {branches.map((b) => (
          <li key={b.id} className="rounded border border-border p-3 text-sm">
            <div className="font-medium">
              {b.name} <span className="text-muted-foreground">({b.code})</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {b.timezone}
              {b.address ? ` · ${b.address}` : ""}
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={onCreate} className="mt-8 max-w-md space-y-3">
        <h2 className="text-sm font-medium">Tambah cabang</h2>
        <input
          name="name"
          required
          placeholder="Nama"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="code"
          required
          placeholder="Kode (mis. MAIN)"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="timezone"
          defaultValue="Asia/Jakarta"
          placeholder="Zona waktu"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="address"
          placeholder="Alamat (opsional)"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          disabled={saving}
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Tambah"}
        </button>
        {error && error !== "401" && error !== "403" ? (
          <p className="text-sm text-red-600">Gagal.</p>
        ) : null}
      </form>
      <footer className="mt-12 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
