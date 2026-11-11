"use client"

import { useEffect, useState } from "react"

type Log = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  actorId: string | null
  createdAt: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/audit-logs?limit=100", { cache: "no-store" }).then(async (res) => {
      if (!res.ok) {
        setError(String(res.status))
        return
      }
      const data = await res.json()
      setLogs(data.logs ?? [])
    })
  }, [])

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!logs) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Audit Log</h1>
      <p className="mt-1 text-sm text-muted-foreground">100 entri terbaru.</p>
      {logs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Belum ada log.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2">Waktu</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>Aktor</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border">
                  <td className="py-2">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="font-mono">{l.action}</td>
                  <td>
                    {l.entityType}
                    {l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="font-mono">{l.actorId ? l.actorId.slice(0, 8) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="mt-12 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
