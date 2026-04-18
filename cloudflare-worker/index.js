// metaarchetech knowledge-base AI proxy
// Deploy to Cloudflare Workers. Set GROQ_API_KEY as a secret:
//   npx wrangler secret put GROQ_API_KEY

import { BASE_VAULT_CONTEXT, RESEARCHER_MODE_CONTEXT, MANAGER_MODE_CONTEXT } from "./vault-context.js"
import { MOC_SNAPSHOT } from "./moc-snapshot.js"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// In-memory rate limiter: max 20 req/min per IP (resets on cold start)
const rateLimiter = new Map()
function checkRate(ip) {
  const now = Date.now()
  const entry = rateLimiter.get(ip)
  if (!entry || now > entry.reset) {
    rateLimiter.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS })
    if (request.method !== "POST")
      return new Response("Method Not Allowed", { status: 405, headers: CORS })

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown"
    if (!checkRate(ip))
      return new Response("Rate limit exceeded. Try again in a minute.", { status: 429, headers: CORS })

    let query, chunks, mode, model
    try {
      ;({ query, chunks, mode, model } = await request.json())
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: CORS })
    }

    if (!query?.trim())
      return new Response("Missing query", { status: 400, headers: CORS })

    const context = (chunks ?? [])
      .map((c, i) => `[${i + 1}] **${c.title}**\n${c.text}`)
      .join("\n\n---\n\n")

    const modeCtx = mode === "manager" ? MANAGER_MODE_CONTEXT : RESEARCHER_MODE_CONTEXT

    const systemPrompt = context
      ? `${BASE_VAULT_CONTEXT}

${MOC_SNAPSHOT}

${modeCtx}

## 引用規則
- 使用 [N] 標記對應 context 來源編號
- 若 context 無相關資訊請直說，不要捏造

## Context 筆記
${context}`
      : `${BASE_VAULT_CONTEXT}

${modeCtx}

沒有找到相關筆記。請告訴使用者嘗試不同關鍵字，或問一個更具體的問題。`

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || (mode === "manager" ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile"),
        stream: true,
        max_tokens: mode === "manager" ? 600 : 1500,
        temperature: mode === "manager" ? 0.3 : 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
      }),
    })

    if (!groqRes.ok) {
      const text = await groqRes.text()
      return new Response(`Groq error: ${text}`, { status: 502, headers: CORS })
    }

    return new Response(groqRes.body, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    })
  },
}
