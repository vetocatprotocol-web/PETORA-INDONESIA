import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { createDb } from "@petora/db"
import { getSetupStatus } from "@petora/core"
import { LocalePicker } from "./locale-picker"
import { ThemeToggle } from "./theme-toggle"

export const dynamic = "force-dynamic"

export default async function Page() {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    const db = createDb(databaseUrl)
    try {
      const status = await getSetupStatus(db)
      if (!status.initialized) redirect("/setup")
    } catch {
      // If DB unavailable, fall through to basic page
    } finally {
      await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
    }
  }

  const t = await getTranslations("Home")

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8 sm:px-8">
      <header className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">Powered by PETORA INDONESIA</p>
          <h1 className="mt-3 text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <LocalePicker />
          <ThemeToggle />
        </div>
      </header>

      <section className="py-12">
        <p className="text-sm font-medium text-accent">{t("sectionLabel")}</p>
        <div className="mt-4 max-w-xl border-l-2 border-accent pl-5">
          <h2 className="text-lg font-semibold">{t("statusTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("statusDescription")}</p>
          <a
            className="mt-5 inline-block text-sm font-semibold text-accent underline underline-offset-4"
            href="/api/health"
          >
            {t("healthCheck")}
          </a>
        </div>
      </section>

      <footer className="mt-auto border-t border-border pt-5 text-xs text-muted-foreground">
        © PETORA INDONESIA. Powered by PETORA INDONESIA.
      </footer>
    </main>
  )
}
