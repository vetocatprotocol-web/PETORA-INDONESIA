"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@petora/ui"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const t = useTranslations("Theme")

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("petora-theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const selectedTheme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : prefersDark
          ? "dark"
          : "light"

    if (storedTheme === "dark" || storedTheme === "light") {
      document.documentElement.dataset.theme = storedTheme
    }
    setIsDark(selectedTheme === "dark")
  }, [])

  function toggleTheme() {
    const theme = isDark ? "light" : "dark"
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("petora-theme", theme)
    setIsDark(theme === "dark")
  }

  return (
    <Button aria-pressed={isDark} onClick={toggleTheme} variant="secondary">
      {isDark ? t("light") : t("dark")}
    </Button>
  )
}
