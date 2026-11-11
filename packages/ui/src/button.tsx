import type { ComponentProps } from "react"

export type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary"
}

const variants = {
  primary: "bg-accent text-background hover:bg-accent-hover",
  secondary: "border border-border bg-background text-foreground hover:bg-muted"
}

export function Button({
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    />
  )
}
