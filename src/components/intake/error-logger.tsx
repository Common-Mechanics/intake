"use client"

import { useEffect } from "react"

/**
 * Global client-side error logger.
 * Catches unhandled errors, promise rejections, and network failures.
 * Logs them with structured context to the console.
 */
export function ErrorLogger() {
  useEffect(() => {
    function logError(type: string, detail: Record<string, unknown>) {
      const entry = {
        type,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...detail,
      }
      console.error(`[Intake ${type}]`, entry)
    }

    /* Unhandled JS errors */
    function onError(event: ErrorEvent) {
      logError("uncaught-error", {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack,
      })
    }

    /* Unhandled promise rejections */
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      logError("unhandled-rejection", {
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      })
    }

    /* Network/fetch failures */
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        if (!response.ok && response.status >= 500) {
          const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0])
          logError("fetch-error", {
            status: response.status,
            statusText: response.statusText,
            url,
          })
        }
        return response
      } catch (err) {
        const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0])
        logError("fetch-network-error", {
          message: err instanceof Error ? err.message : String(err),
          url,
        })
        throw err
      }
    }

    /* Console.error interception — tag all console.error calls with timestamp */
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      /* Skip if it's already our tagged error (prevent recursion) */
      if (typeof args[0] === "string" && args[0].startsWith("[Intake")) {
        originalConsoleError(...args)
        return
      }
      originalConsoleError(`[${new Date().toISOString()}]`, ...args)
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onUnhandledRejection)

    console.info("[Intake] Error logging initialized")

    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
      window.fetch = originalFetch
      console.error = originalConsoleError
    }
  }, [])

  return null
}
