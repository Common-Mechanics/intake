export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {children}
    </main>
  )
}
