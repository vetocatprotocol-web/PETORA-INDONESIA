export const runtime = "nodejs"

export const metadata = {
  title: "PETORA INDONESIA",
  description: "Panel staf petshop + klinik hewan"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
