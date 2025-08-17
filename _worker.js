// Cloudflare Pages Worker: Minimal FCM relay without Firebase Functions (free)
// Requires Pages project Environment Variables:
// - FCM_SERVER_KEY: Your Firebase Cloud Messaging legacy server key (AAAA...)
// - ORIGIN (optional): Allowed CORS origin, e.g. https://glowchocolate-elyx.pages.dev

const FCM_LEGACY_URL = 'https://fcm.googleapis.com/fcm/send'

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret',
  }
}

async function handleOptions(request, env) {
  const origin = env.ORIGIN || '*'
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

async function handleNotify(request, env) {
  const origin = env.ORIGIN || '*'
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) })
  }
  if (!env.FCM_SERVER_KEY) {
    return new Response('Missing FCM_SERVER_KEY', { status: 500, headers: corsHeaders(origin) })
  }
  let body
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders(origin) })
  }
  const tokens = Array.isArray(body.tokens) ? body.tokens.filter(Boolean) : []
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'no_tokens' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } })
  }
  const notification = body.notification || { title: 'GlowChocolate', body: '' }
  const data = body.data || {}

  // FCM legacy supports up to 1000 tokens per request; chunk to be safe
  const chunkSize = 900
  let successCount = 0
  let failureCount = 0
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const batch = tokens.slice(i, i + chunkSize)
    const payload = {
      registration_ids: batch,
      notification,
      data,
    }
    const res = await fetch(FCM_LEGACY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `key=${env.FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      failureCount += batch.length
      continue
    }
    try {
      const r = await res.json()
      successCount += Number(r.success) || 0
      failureCount += Number(r.failure) || 0
    } catch {
      // ignore parse errors
    }
  }

  return new Response(JSON.stringify({ success: true, successCount, failureCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return handleOptions(request, env)
    if (url.pathname === '/api/notify') return handleNotify(request, env)
    return env.ASSETS.fetch(request)
  }
}
