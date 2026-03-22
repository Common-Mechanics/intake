export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="text-center max-w-md flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          This link isn&apos;t valid
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          The intake form you&apos;re looking for doesn&apos;t exist or the link
          may have changed.
        </p>
        <p className="text-sm text-muted-foreground/70">
          Contact us if you believe this is an error.
        </p>
      </div>
    </div>
  )
}
