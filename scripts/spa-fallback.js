// Create dist/404.html as a copy of dist/index.html for Cloudflare Pages SPA fallback
import { copyFileSync, existsSync, unlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const distDir = resolve(__dirname, '..', 'dist')
const indexHtml = resolve(distDir, 'index.html')
const notFoundHtml = resolve(distDir, '404.html')
const redirectsFile = resolve(distDir, '_redirects')
const workerSrc = resolve(__dirname, '..', '_worker.js')
const workerDst = resolve(distDir, '_worker.js')

if (existsSync(indexHtml)) {
  try {
    copyFileSync(indexHtml, notFoundHtml)
    console.log('[SPA] 404.html created for Cloudflare Pages fallback')
  } catch (e) {
    console.warn('[SPA] Could not create 404.html:', e?.message || e)
  }
} else {
  console.warn('[SPA] dist/index.html not found; skip 404.html copy')
}

// Ensure no Netlify-style _redirects remains (can break assets MIME on Pages)
try {
  if (existsSync(redirectsFile)) {
    unlinkSync(redirectsFile)
    console.log('[SPA] Removed dist/_redirects to avoid asset rewrites')
  }
} catch (e) {
  console.warn('[SPA] Could not remove dist/_redirects:', e?.message || e)
}

// Copy root _worker.js to dist for Cloudflare Pages Advanced Mode
try {
  if (existsSync(workerSrc)) {
    copyFileSync(workerSrc, workerDst)
    console.log('[SPA] Copied _worker.js to dist for Pages Functions')
  } else {
    console.warn('[SPA] _worker.js not found at project root; skipping copy')
  }
} catch (e) {
  console.warn('[SPA] Could not copy _worker.js:', e?.message || e)
}
