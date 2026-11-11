"use client"

import { useLocale, useTranslations } from "next-intl"

export function LocalePicker() {
  const locale = useLocale()
  const t = useTranslations("Locale")

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{t("label")}</span>
      <select
        aria-label={t("label")}
        className="h-10 rounded border border-border bg-background px-3 text-sm text-foreground"
        value={locale}
        onChange={(event) => {
          document.cookie = `petora-locale=${event.currentTarget.value}; path=/; max-age=31536000; samesite=lax`
          window.location.reload()
        }}
      >
        <option value="id">{t("indonesian")}</option>
        <option value="en">{t("english")}</option>
      </select>
    </label>
  )
}
