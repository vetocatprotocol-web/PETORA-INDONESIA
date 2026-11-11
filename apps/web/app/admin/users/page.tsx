"use client"

import { useEffect, useState } from "react"

type User = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  realm: string
  isActive: boolean
}
type Role = { id: string; key: string; name: string }
type Branch = { id: string; name: string; code: string }
type Assignment = {
  id: string
  userId: string
  roleId: string
  scope: string
  branchIds: string[] | null
  roleKey: string
  roleName: string
  userName: string | null
  userEmail: string | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [branches, setBranches] = useState<Branch[] | null>(null)
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [u, r, b, a] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/roles", { cache: "no-store" }),
      fetch("/api/admin/branches", { cache: "no-store" }),
      fetch("/api/admin/users/assignments", { cache: "no-store" })
    ])
    if ([u, r, b, a].some((x) => x.status === 401 || x.status === 403)) {
      setError("403")
      return
    }
    if (!u.ok || !r.ok || !b.ok || !a.ok) {
      setError("load_failed")
      return
    }
    setUsers((await u.json()).users ?? [])
    setRoles((await r.json()).roles ?? [])
    setBranches((await b.json()).branches ?? [])
    setAssignments((await a.json()).assignments ?? [])
  }
  useEffect(() => {
    void load()
  }, [])

  async function onAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const scope = String(form.get("scope") || "assigned_branches") as
      "all_branches" | "assigned_branches" | "self_only"
    const branchIds = form.getAll("branchIds").map(String).filter(Boolean)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: String(form.get("userId") || ""),
        roleId: String(form.get("roleId") || ""),
        scope,
        branchIds: scope === "assigned_branches" ? branchIds : []
      })
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || "assign_failed")
      return
    }
    await load()
  }

  async function removeAssignment(id: string) {
    if (!confirm("Hapus penugasan role ini?")) return
    setSaving(true)
    const res = await fetch("/api/admin/users/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: id })
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error || "remove_failed")
      return
    }
    await load()
  }

  function branchLabel(ids: string[] | null | undefined) {
    if (!ids || ids.length === 0) return "-"
    const map = new Map((branches ?? []).map((b) => [b.id, `${b.name} (${b.code})`]))
    return ids.map((id) => map.get(id) || id.slice(0, 8)).join(", ")
  }

  if (error === "401" || error === "403") return <main className="p-8">Akses ditolak.</main>
  if (!users || !roles || !branches || !assignments) return <main className="p-8">Memuat…</main>

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
      <h1 className="mt-2 text-2xl font-semibold">Pengguna & Penugasan Role</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kelola penugasan user↔role↔cabang. Manajemen akun/pembuatan pengguna lengkap menyusul.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Penugasan aktif ({assignments.length})</h2>
        {assignments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada penugasan.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded border border-border p-3"
              >
                <div>
                  <div className="font-medium">
                    {a.userName || a.userEmail || a.userId.slice(0, 8)} → {a.roleName}{" "}
                    <span className="text-muted-foreground">({a.roleKey})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    scope: {a.scope} · cabang:{" "}
                    {a.scope === "assigned_branches"
                      ? branchLabel(a.branchIds)
                      : a.scope === "all_branches"
                        ? "semua"
                        : "-"}
                  </div>
                </div>
                <button
                  disabled={saving}
                  onClick={() => removeAssignment(a.id)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded border border-border p-4">
        <h2 className="text-sm font-medium">Tugaskan role ke pengguna</h2>
        <form onSubmit={onAssign} className="mt-3 max-w-xl space-y-3">
          <select
            name="userId"
            required
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Pilih pengguna…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email || u.phone || u.id}
              </option>
            ))}
          </select>
          <select
            name="roleId"
            required
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Pilih role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.key})
              </option>
            ))}
          </select>
          <select
            name="scope"
            defaultValue="assigned_branches"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all_branches">Semua cabang</option>
            <option value="assigned_branches">Cabang tertentu</option>
            <option value="self_only">Hanya data sendiri</option>
          </select>
          <fieldset className="rounded border border-border p-2">
            <legend className="px-1 text-xs">Cabang (untuk scope cabang tertentu)</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="branchIds" value={b.id} /> {b.name} ({b.code})
                </label>
              ))}
            </div>
          </fieldset>
          <button
            disabled={saving}
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Simpan penugasan"}
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
