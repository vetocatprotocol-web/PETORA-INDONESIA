"use client"

import { useEffect, useState } from "react"

type Me = { user: { twoFactorEnabled: boolean; email: string | null } }

export default function SecurityPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [uri, setUri] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch("/api/admin/me", { cache: "no-store" })
    if (res.ok) setMe(await res.json())
  }
  useEffect(() => {
    void load()
  }, [])

  async function enroll() {
    setBusy(true)
    setMsg(null)
    const res = await fetch("/api/auth/staff/totp/enroll", { method: "POST" })
    setBusy(false)
    if (!res.ok) {
      setMsg("Gagal memulai enrollment.")
      return
    }
    const data = await res.json()
    setUri(data.uri)
  }

  async function confirm() {
    setBusy(true)
    setMsg(null)
    const res = await fetch("/api/auth/staff/totp/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })
    setBusy(false)
    if (!res.ok) {
      setMsg("Kode tidak valid.")
      return
    }
    setMsg("2FA aktif.")
    setUri(null)
    setCode("")
    await load()
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Keamanan Akun</h1>
      <p className="mt-2 text-sm">
        Status 2FA: <strong>{me?.user.twoFactorEnabled ? "Aktif" : "Belum aktif"}</strong>
      </p>
      {!me?.user.twoFactorEnabled && !uri && (
        <button
          onClick={enroll}
          disabled={busy}
          className="mt-4 rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Aktifkan 2FA
        </button>
      )}
      {uri && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Tambahkan akun ke aplikasi authenticator menggunakan URI ini, lalu masukkan kode 6
            digit:
          </p>
          <textarea
            readOnly
            value={uri}
            className="w-full rounded border border-border bg-background p-2 font-mono text-xs"
            rows={4}
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kode 6 digit"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={confirm}
            disabled={busy || code.length < 6}
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Konfirmasi
          </button>
        </div>
      )}
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <footer className="mt-12 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
