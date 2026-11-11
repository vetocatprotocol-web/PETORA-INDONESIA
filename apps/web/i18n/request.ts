import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"

export default getRequestConfig(async () => {
  const localeCookie = (await cookies()).get("petora-locale")?.value
  const locale = localeCookie === "en" ? "en" : "id"
  const messages =
    locale === "en"
      ? (await import("../messages/en.json")).default
      : (await import("../messages/id.json")).default

  return { locale, messages }
})
