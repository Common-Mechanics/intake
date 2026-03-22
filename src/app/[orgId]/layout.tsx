export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col">
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
}
