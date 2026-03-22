#!/usr/bin/env node

/**
 * Takes desktop + mobile screenshots of the intake form.
 * Uses Puppeteer from ai-dossier (shared tooling).
 *
 * Usage: node scripts/screenshot.mjs [orgId]
 * Default orgId: aiwi-92750570
 */

import puppeteer from "/Users/herrhaase/code/ai-dossier/web/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js"
import { mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = join(__dirname, "..", "screenshots")
mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const ORG_ID = process.argv[2] || "aiwi-92750570"
const BASE_URL = `http://localhost:3000/${ORG_ID}`

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3 },
}

async function takeScreenshots() {
  const browser = await puppeteer.launch({ headless: true })

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage()
    await page.setViewport(viewport)

    // Take screenshots of each step
    for (let step = 1; step <= 5; step++) {
      const stepParam = step === 1 ? "your-publication" :
        step === 2 ? "categories-and-editors" :
        step === 3 ? "sentiment-and-scoring" :
        step === 4 ? "sources-and-discovery" : "review-and-launch"

      const url = `${BASE_URL}?step=${stepParam}`
      console.log(`  ${device} step ${step}: ${url}`)

      await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 })
      await new Promise(r => setTimeout(r, 1500)) // wait for fonts + animations

      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${device}-step${step}.jpeg`),
        type: "jpeg",
        quality: 85,
        fullPage: true,
      })
    }

    await page.close()
  }

  await browser.close()
  console.log(`\nScreenshots saved to ${SCREENSHOTS_DIR}/`)
}

takeScreenshots().catch(console.error)
