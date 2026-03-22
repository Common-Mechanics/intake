export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col">
      {/* Minimal branding — hidden on mobile to save screen space */}
      <div className="hidden md:block px-4 pt-3 pb-0 md:pt-4">
        <span className="text-xs text-muted-foreground/60 tracking-wide uppercase">
          Common Mechanics
        </span>
      </div>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
}
