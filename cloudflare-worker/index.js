// metaarchetech knowledge-base AI proxy
// Deploy to Cloudflare Workers. Set GROQ_API_KEY as a secret:
//   npx wrangler secret put GROQ_API_KEY

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

    let query, chunks
    try {
      ;({ query, chunks } = await request.json())
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: CORS })
    }

    if (!query?.trim())
      return new Response("Missing query", { status: 400, headers: CORS })

    const context = (chunks ?? [])
      .map((c, i) => `[${i + 1}] **${c.title}**\n${c.text}`)
      .join("\n\n---\n\n")

    const systemPrompt = context
      ? `You are a knowledge assistant for a personal Obsidian vault published as a digital garden.
Answer the user's question using ONLY the notes provided below. Be concise.
If you cite a note, use [N] notation matching the context numbers.
If the context doesn't contain relevant information, say so honestly.

Context notes:
${context}`
      : `You are a knowledge assistant for a personal digital garden. The query didn't match any notes. Tell the user to try different keywords.`

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        max_tokens: 600,
        temperature: 0.3,
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
