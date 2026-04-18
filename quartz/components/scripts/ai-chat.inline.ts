interface Chunk {
  text: string
  slug: string
  title: string
}

class BM25 {
  private k1 = 1.5
  private b = 0.75
  private idf = new Map<string, number>()
  private avgDl: number

  constructor(private docs: Chunk[]) {
    const lengths = docs.map((d) => this.tok(d.text).length)
    this.avgDl = lengths.reduce((s, l) => s + l, 0) / (lengths.length || 1)
    const N = docs.length
    const df = new Map<string, number>()
    for (const doc of docs)
      for (const t of new Set(this.tok(doc.text))) df.set(t, (df.get(t) ?? 0) + 1)
    for (const [t, f] of df)
      this.idf.set(t, Math.log((N - f + 0.5) / (f + 0.5) + 1))
  }

  private tok(text: string): string[] {
    // ASCII words + individual CJK characters (Chinese has no spaces)
    const ascii = text.toLowerCase().match(/[a-z0-9]+/g) ?? []
    const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []
    return [...ascii, ...cjk]
  }

  search(query: string, k = 5): Chunk[] {
    const qTerms = this.tok(query)
    const scored = this.docs.map((doc) => {
      const tokens = this.tok(doc.text)
      const dl = tokens.length
      const tf = new Map<string, number>()
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
      let score = 0
      for (const q of qTerms) {
        const idf = this.idf.get(q) ?? 0
        const f = tf.get(q) ?? 0
        score +=
          (idf * (f * (this.k1 + 1))) /
          (f + this.k1 * (1 - this.b + (this.b * dl) / this.avgDl))
      }
      return { doc, score }
    })
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .filter((s) => s.score > 0)
      .map((s) => s.doc)
  }
}

document.addEventListener("nav", () => {
  const root = document.getElementById("dna-ai-chat") as HTMLElement | null
  if (!root) return

  const workerUrl = root.dataset.workerUrl ?? ""
  const fab = document.getElementById("dna-ai-fab") as HTMLButtonElement
  const panel = document.getElementById("dna-ai-panel") as HTMLElement
  const closeBtn = document.getElementById("dna-ai-close") as HTMLButtonElement
  const msgContainer = document.getElementById("dna-ai-messages") as HTMLElement
  const input = document.getElementById("dna-ai-input") as HTMLInputElement
  const sendBtn = document.getElementById("dna-ai-send") as HTMLButtonElement

  let bm25: BM25 | null = null
  let isStreaming = false
  let abortCtrl: AbortController | null = null

  // ── Panel open/close ───────────────────────────────────────────────────────

  const openPanel = () => {
    panel.classList.add("dna-open")
    input.focus()
    // Pre-warm the index
    ensureIndex().catch(() => {})
  }
  const closePanel = () => {
    panel.classList.remove("dna-open")
    abortCtrl?.abort()
  }

  fab.addEventListener("click", openPanel)
  closeBtn.addEventListener("click", closePanel)
  window.addCleanup(() => {
    fab.removeEventListener("click", openPanel)
    closeBtn.removeEventListener("click", closePanel)
  })

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && panel.classList.contains("dna-open")) closePanel()
  }
  document.addEventListener("keydown", onKey)
  window.addCleanup(() => document.removeEventListener("keydown", onKey))

  // ── Index loading ──────────────────────────────────────────────────────────

  const ensureIndex = async () => {
    if (bm25) return
    const res = await fetch("/search-chunks.json")
    if (!res.ok) throw new Error("search-chunks.json not found — run npm run build:search")
    const chunks: Chunk[] = await res.json()
    bm25 = new BM25(chunks)
  }

  // ── Message rendering ──────────────────────────────────────────────────────

  const addMessage = (role: "user" | "assistant") => {
    const wrap = document.createElement("div")
    wrap.className = `dna-ai-msg dna-ai-msg--${role}`
    const textEl = document.createElement("div")
    textEl.className = "dna-ai-bubble"
    wrap.appendChild(textEl)
    msgContainer.appendChild(wrap)
    msgContainer.scrollTop = msgContainer.scrollHeight
    return { wrap, textEl }
  }

  const appendSources = (wrap: HTMLElement, chunks: Chunk[]) => {
    if (!chunks.length) return
    const seen = new Set<string>()
    const row = document.createElement("div")
    row.className = "dna-ai-sources"
    for (const c of chunks) {
      if (seen.has(c.slug)) continue
      seen.add(c.slug)
      const a = document.createElement("a")
      a.href = `/${c.slug}`
      a.className = "dna-ai-chip"
      a.textContent = c.title
      row.appendChild(a)
    }
    wrap.appendChild(row)
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  const send = async () => {
    const query = input.value.trim()
    if (!query || isStreaming) return
    input.value = ""
    isStreaming = true
    sendBtn.disabled = true

    addMessage("user").textEl.textContent = query

    const { wrap: aiWrap, textEl } = addMessage("assistant")
    textEl.innerHTML = '<span class="dna-ai-cursor"></span>'
    msgContainer.scrollTop = msgContainer.scrollHeight

    try {
      await ensureIndex()
      const topChunks = bm25!.search(query, 5)

      abortCtrl = new AbortController()
      const res = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chunks: topChunks }),
        signal: abortCtrl.signal,
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ""
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop()!
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") continue
          try {
            const token = JSON.parse(data).choices?.[0]?.delta?.content
            if (token) {
              full += token
              textEl.textContent = full
              msgContainer.scrollTop = msgContainer.scrollHeight
            }
          } catch {}
        }
      }

      textEl.textContent = full || "(no response)"
      appendSources(aiWrap, topChunks)
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError"
      if (!isAbort) {
        textEl.textContent =
          err instanceof Error ? `⚠ ${err.message}` : "⚠ Unknown error"
      }
    } finally {
      isStreaming = false
      sendBtn.disabled = false
      msgContainer.scrollTop = msgContainer.scrollHeight
    }
  }

  sendBtn.addEventListener("click", send)
  const onEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }
  input.addEventListener("keydown", onEnter)
  window.addCleanup(() => {
    sendBtn.removeEventListener("click", send)
    input.removeEventListener("keydown", onEnter)
  })
})
