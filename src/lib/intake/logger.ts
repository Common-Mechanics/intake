/**
 * Structured logger for server-side debugging.
 * Outputs JSON objects to console for easy parsing in production logs.
 */

function formatEntry(
  level: "error" | "warn" | "info",
  operation: string,
  message: string,
  context?: Record<string, unknown>
) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    operation,
    message,
    ...(context && { context }),
  })
}

export const logger = {
  error(operation: string, error: unknown, context?: Record<string, unknown>) {
    const message =
      error instanceof Error ? error.message : String(error)
    const stack =
      error instanceof Error ? error.stack : undefined
    console.error(
      formatEntry("error", operation, message, { ...context, stack })
    )
  },

  warn(
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    console.warn(formatEntry("warn", operation, message, context))
  },

  info(
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    console.info(formatEntry("info", operation, message, context))
  },
}
