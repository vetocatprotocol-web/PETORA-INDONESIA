"use client"

import { useEffect, useMemo, useState } from "react"

type Role = {
  id: string
  key: string
  name: string
  isSystem: boolean
  isOwner: boolean
  defaultScope: string
  permissions: string[]
}
type Perm = { key: string; module: string; descriptionId: string; risk: string }

export default function RolesPage() {
  const [data, setData] = useState<{ roles: Role[]; catalog: Perm[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selPerms, setSelPerms] = useState<string[]>([])

  async function load() {
    const res = await fetch("/api/admin/roles", { cache: "no-store" })
    if (!res.ok) {
      setError(String(res.status))
      return
    }
    setData(await res.json())
  }
  useEffect(() => {
    void load()
  }, [])

  const byModule = useMemo(() => {
    const m = new Map<string, Perm[]>()
    for (const p of data?.catalog ?? []) {
      const arr = m.get(p.module) ?? []
      arr.push(p)
      m.set(p.module, arr)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [data])

  function togglePerm(key: string) {
    setSelPerms((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]))
  }
  function toggleModule(perms: Perm[]) {
    const all = perms.every((p) => selPerms.includes(p.key))
    if (all) setSelPerms((s) => s.filter((k) => !perms.some((p) => p.key === k)))
    else setSelPerms((s) => [...new Set([...s, ...perms.map((p) => p.key)])])
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: String(form.get("key") || ""),
        name: String(form.get("name") || ""),
        defaultScope: String(form.get("defaultScope") || "assigned_branches"),
        permissions: selPerms
      })
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || "create_failed")
      return
    }
    ;(e.target as HTMLFormElement).reset()
    setSelPerms([])
    await load()
  }

  async function saveRole(role: Role, perms: string[], name: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, permissions: perms })
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || "update_failed")
      return
    }
    await load()
  }

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!data) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Role & Hak Akses</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Buat/edit role kustom dan set permission. Role Owner terkunci. Penugasan user↔role↔cabang
        dan simulasi &quot;lihat sebagai&quot; belum tersedia.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Role ({data.roles.length})</h2>
        <div className="mt-3 space-y-3">
          {data.roles.map((r) => (
            <RoleEditor
              key={r.id}
              role={r}
              catalog={data.catalog}
              saving={saving}
              onSave={saveRole}
              onCloned={load}
            />
          ))}
        </div>
      </section>

      <section className="mt-10 rounded border border-border p-4">
        <h2 className="text-sm font-medium">Buat role kustom</h2>
        <form onSubmit={onCreate} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="key"
              required
              placeholder="key (mis. kasir_senior)"
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              name="name"
              required
              placeholder="Nama role"
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              name="defaultScope"
              defaultValue="assigned_branches"
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all_branches">Semua cabang</option>
              <option value="assigned_branches">Cabang ditugaskan</option>
              <option value="self_only">Hanya data sendiri</option>
            </select>
          </div>
          <div className="max-h-72 space-y-3 overflow-auto rounded border border-border p-3">
            {byModule.map(([mod, perms]) => (
              <div key={mod}>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <input
                    type="checkbox"
                    checked={perms.every((p) => selPerms.includes(p.key))}
                    onChange={() => toggleModule(perms)}
                  />
                  {mod}
                </label>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  {perms.map((p) => (
                    <label key={p.key} className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selPerms.includes(p.key)}
                        onChange={() => togglePerm(p.key)}
                      />
                      <span>
                        <span className="font-mono">{p.key}</span>{" "}
                        <span className="text-muted-foreground">({p.risk})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            disabled={saving}
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Buat role"}
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

function RoleEditor({
  role,
  catalog,
  saving,
  onSave,
  onCloned
}: {
  role: Role
  catalog: Perm[]
  saving: boolean
  onSave: (_role: Role, _perms: string[], _name: string) => void | Promise<void>
  onCloned: () => void | Promise<void>
}) {
  const [perms, setPerms] = useState<string[]>(role.permissions)
  const [name, setName] = useState(role.name)
  useEffect(() => {
    setPerms(role.permissions)
    setName(role.name)
  }, [role.permissions, role.name, role.id])
  const locked = role.isOwner
  const byModule = useMemo(() => {
    const m = new Map<string, Perm[]>()
    for (const p of catalog) {
      const arr = m.get(p.module) ?? []
      arr.push(p)
      m.set(p.module, arr)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [catalog])
  return (
    <details className="rounded border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        {role.name} <span className="text-muted-foreground">({role.key})</span>
        {role.isOwner ? (
          <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">Owner</span>
        ) : null}
        {role.isSystem && !role.isOwner ? (
          <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">Sistem</span>
        ) : null}
        <span className="ml-2 text-xs text-muted-foreground">
          {perms.length} permission · {role.defaultScope}
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <input
          disabled={locked}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-sm rounded border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
        />
        <div className="max-h-60 space-y-2 overflow-auto rounded border border-border p-2">
          {byModule.map(([mod, ps]) => (
            <div key={mod}>
              <div className="text-xs font-semibold uppercase text-muted-foreground">{mod}</div>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                {ps.map((p) => (
                  <label key={p.key} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={perms.includes(p.key)}
                      onChange={() =>
                        setPerms((s) =>
                          s.includes(p.key) ? s.filter((x) => x !== p.key) : [...s, p.key]
                        )
                      }
                    />
                    <span className="font-mono">{p.key}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked ? (
            <button
              disabled={saving}
              onClick={() => onSave(role, perms, name)}
              className="rounded border border-border px-3 py-1 text-xs disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Role Owner tidak dapat diubah.</p>
          )}
          <button
            disabled={saving}
            onClick={async () => {
              const newName = prompt("Nama role hasil klon:", `${role.name} (Salinan)`)
              if (!newName) return
              const newKey = prompt("Key role (huruf kecil/angka/underscore):", `${role.key}_copy`)
              if (!newKey) return
              const res = await fetch("/api/admin/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: newKey, name: newName, sourceRoleId: role.id })
              })
              if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                alert(`Gagal klon: ${j.error || res.status}`)
                return
              }
              await onCloned()
            }}
            className="rounded border border-border px-3 py-1 text-xs disabled:opacity-60"
          >
            Klon
          </button>
        </div>
      </div>
    </details>
  )
}
