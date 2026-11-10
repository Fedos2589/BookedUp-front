// Renders the PWA's PNG icons from the SVG sources with Playwright's Chromium:
//   public/favicon.svg        → pwa-192.png, pwa-512.png (rounded, purpose any)
//   pwa/icon-full-bleed.svg   → pwa-maskable-512.png, apple-touch-icon.png
// Run after changing a source: npm run pwa:icons
import { readFile } from 'node:fs/promises'

import { chromium } from '@playwright/test'

const icons = [
  ['public/favicon.svg', 'public/pwa-192.png', 192],
  ['public/favicon.svg', 'public/pwa-512.png', 512],
  ['pwa/icon-full-bleed.svg', 'public/pwa-maskable-512.png', 512],
  ['pwa/icon-full-bleed.svg', 'public/apple-touch-icon.png', 180],
]

const browser = await chromium.launch()
try {
  for (const [source, target, size] of icons) {
    const svg = await readFile(source, 'utf8')
    const page = await browser.newPage({
      viewport: { width: size, height: size },
    })
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    )
    await page.screenshot({ path: target, omitBackground: true })
    await page.close()
    console.log(`${target} ${size}×${size}`)
  }
} finally {
  await browser.close()
}
