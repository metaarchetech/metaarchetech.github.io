// @ts-ignore
import aiChatScript from "./scripts/ai-chat.inline"
import { QuartzComponent, QuartzComponentConstructor } from "./types"

interface AiChatOptions {
  workerUrl: string
}

export default ((opts: AiChatOptions) => {
  const AiChat: QuartzComponent = () => (
    <div id="dna-ai-chat" data-worker-url={opts.workerUrl}>

      {/* ── Floating action button ─────────────────────────────────────── */}
      <button id="dna-ai-fab" aria-label="Ask AI about your knowledge base">
        {/* pulse ring */}
        <span class="dna-ai-fab-pulse" aria-hidden="true" />
        {/* chat bubble icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <line x1="9" y1="10" x2="15" y2="10" strokeWidth="1.4"/>
          <line x1="9" y1="13" x2="13" y2="13" strokeWidth="1.4"/>
        </svg>
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      <div id="dna-ai-panel" class="dna-ai-panel" role="dialog" aria-label="Knowledge base AI assistant">
        <canvas id="dna-ai-canvas" class="dna-ai-canvas" aria-hidden="true" />
        <div class="dna-ai-resize-top" aria-hidden="true" />
        <div class="dna-ai-resize-left" aria-hidden="true" />

        {/* Header */}
        <div class="dna-ai-header">
          <div class="dna-ai-header-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="dna-ai-header-info">
            <div class="dna-ai-header-name">Knowledge Assistant</div>
            <div class="dna-ai-header-status">
              <span class="live-dot" aria-hidden="true" />
              <span>Powered by Groq · Llama 3.3</span>
            </div>
          </div>
          <button id="dna-ai-close" class="dna-ai-close" aria-label="Close">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="1" y1="1" x2="11" y2="11"/>
              <line x1="11" y1="1" x2="1" y2="11"/>
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div class="dna-ai-mode-bar">
          <button class="dna-ai-mode-btn dna-ai-mode-btn--active" data-mode="researcher" aria-pressed="true">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            研究者
          </button>
          <button class="dna-ai-mode-btn" data-mode="manager" aria-pressed="false">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            管理者
          </button>
        </div>

        {/* Model toggles — populated by JS */}
        <div id="dna-ai-model-toggles" class="dna-ai-model-toggles" />

        {/* Messages */}
        <div id="dna-ai-messages" class="dna-ai-messages">
          <div class="dna-ai-msg dna-ai-msg--assistant">
            <div class="dna-ai-bubble">你好。問我關於這個知識庫的任何問題。</div>
          </div>
        </div>

        {/* Starter chips */}
        <div id="dna-ai-chips" class="dna-ai-chips" />

        {/* Input */}
        <div class="dna-ai-input-row">
          <input
            id="dna-ai-input"
            class="dna-ai-input"
            type="text"
            placeholder="問問題..."
            autocomplete="off"
            spellcheck={false}
          />
          <button id="dna-ai-send" class="dna-ai-send" aria-label="Send">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  )

  AiChat.afterDOMLoaded = aiChatScript

  AiChat.css = `
/* ── Root container — anchored to FAB only, panel floats above ─────────── */
#dna-ai-chat {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 8500;
  width: 52px;
  height: 52px;
  pointer-events: none;
}

/* ── FAB ──────────────────────────────────────────────────────────────── */
#dna-ai-fab {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid rgba(118, 185, 0, 0.45);
  background: rgba(118, 185, 0, 0.15);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  color: #76b900;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 200ms ease, box-shadow 200ms ease, transform 150ms ease;
  box-shadow:
    0 0 0 0 rgba(118, 185, 0, 0),
    0 8px 24px rgba(0,0,0,0.35),
    0 0 20px rgba(118, 185, 0, 0.2);
  outline: none;
  padding: 0;
}
#dna-ai-fab:hover {
  background: rgba(118, 185, 0, 0.25);
  box-shadow:
    0 0 32px rgba(118, 185, 0, 0.35),
    0 8px 28px rgba(0,0,0,0.4);
  transform: scale(1.06);
}
#dna-ai-fab:active { transform: scale(0.96); }

/* Pulse ring */
.dna-ai-fab-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(118, 185, 0, 0.5);
  animation: dna-fab-pulse 2.5s ease-out infinite;
}
@keyframes dna-fab-pulse {
  0%   { transform: scale(1);    opacity: 0.7; }
  70%  { transform: scale(1.35); opacity: 0; }
  100% { transform: scale(1.35); opacity: 0; }
}

/* ── Panel — floats above FAB via absolute positioning ─────────────────── */
.dna-ai-panel {
  position: absolute;
  bottom: calc(52px + 0.875rem);
  right: 0;
  pointer-events: none;
  width: 440px;
  height: 500px;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(10, 10, 12, 0.88);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 0 0 1px rgba(118,185,0,0.05),
    0 40px 100px rgba(0,0,0,0.65),
    0 0 60px rgba(118,185,0,0.06);
  transform: translateY(16px) scale(0.96);
  opacity: 0;
  transition:
    transform 350ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 220ms ease;
  overflow: hidden;
}
.dna-ai-panel.dna-open {
  pointer-events: auto;
  transform: translateY(0) scale(1);
  opacity: 1;
}

:root[saved-theme="light"] .dna-ai-panel {
  background: rgba(250, 250, 252, 0.92);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.9),
    0 24px 70px rgba(0,0,0,0.18),
    0 0 0 1px rgba(118,185,0,0.06);
}

/* ── Header ───────────────────────────────────────────────────────────── */
.dna-ai-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1rem 0.875rem;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  background: rgba(118, 185, 0, 0.04);
}
:root[saved-theme="light"] .dna-ai-header {
  border-bottom-color: rgba(0,0,0,0.07);
  background: rgba(118, 185, 0, 0.03);
}

.dna-ai-header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(118, 185, 0, 0.35);
  background: rgba(118, 185, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #76b900;
  flex-shrink: 0;
}

.dna-ai-header-info { flex: 1; min-width: 0; }
.dna-ai-header-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--dark);
  line-height: 1.2;
}
.dna-ai-header-status {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--codeFont);
  font-size: 9px;
  letter-spacing: 0.05em;
  color: var(--gray);
  margin-top: 0.2rem;
}

.dna-ai-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  cursor: pointer;
  color: var(--gray);
  transition: color 150ms, background 150ms;
  outline: none;
  padding: 0;
  flex-shrink: 0;
}
.dna-ai-close:hover {
  color: var(--dark);
  background: rgba(255,255,255,0.07);
}
:root[saved-theme="light"] .dna-ai-close:hover { background: rgba(0,0,0,0.06); }

/* ── Mode toggle bar ─────────────────────────────────────────────────── */
.dna-ai-mode-bar {
  display: flex;
  gap: 0.375rem;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  background: rgba(0,0,0,0.12);
}
:root[saved-theme="light"] .dna-ai-mode-bar {
  border-bottom-color: rgba(0,0,0,0.07);
  background: rgba(0,0,0,0.03);
}
.dna-ai-mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.3rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  cursor: pointer;
  font-family: var(--codeFont);
  font-size: 10px;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: var(--gray);
  transition: color 150ms, background 150ms, border-color 150ms, box-shadow 150ms;
  outline: none;
}
.dna-ai-mode-btn:hover {
  color: var(--dark);
  background: rgba(255,255,255,0.06);
}
:root[saved-theme="light"] .dna-ai-mode-btn:hover { background: rgba(0,0,0,0.05); }

.dna-ai-mode-btn--active {
  color: #76b900 !important;
  background: rgba(118, 185, 0, 0.13) !important;
  border-color: rgba(118, 185, 0, 0.35) !important;
  box-shadow: 0 0 10px rgba(118, 185, 0, 0.12);
}

/* ── Messages ─────────────────────────────────────────────────────────── */
.dna-ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 100px;
  scroll-behavior: smooth;
}
.dna-ai-messages::-webkit-scrollbar { width: 4px; }
.dna-ai-messages::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

.dna-ai-msg {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}
.dna-ai-msg--user    { align-self: flex-end; align-items: flex-end; }
.dna-ai-msg--assistant { align-self: flex-start; align-items: flex-start; max-width: 96%; }

.dna-ai-bubble {
  font-size: 0.875rem;
  line-height: 1.6;
  padding: 0.625rem 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.dna-ai-msg--user .dna-ai-bubble {
  background: rgba(118, 185, 0, 0.16);
  border: 1px solid rgba(118, 185, 0, 0.28);
  color: var(--dark);
  border-radius: 18px 18px 4px 18px;
}
.dna-ai-msg--assistant .dna-ai-bubble {
  background: rgba(255,255,255,0.055);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--dark);
  border-radius: 4px 18px 18px 18px;
}
:root[saved-theme="light"] .dna-ai-msg--assistant .dna-ai-bubble {
  background: rgba(0,0,0,0.04);
  border-color: rgba(0,0,0,0.08);
}

/* streaming cursor */
.dna-ai-cursor {
  display: inline-block;
  width: 2px;
  height: 0.85em;
  background: #76b900;
  margin-left: 2px;
  vertical-align: text-bottom;
  border-radius: 1px;
  animation: dna-blink 0.85s step-end infinite;
}
@keyframes dna-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* ── Source chips ─────────────────────────────────────────────────────── */
.dna-ai-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.4rem;
  padding: 0 0.1rem;
}
.dna-ai-chip {
  font-family: var(--codeFont);
  font-size: 9px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.18em 0.6em;
  border-radius: 999px;
  border: 1px solid rgba(118, 185, 0, 0.3);
  color: #76b900;
  background: rgba(118, 185, 0, 0.07);
  text-decoration: none;
  transition: background 150ms, border-color 150ms;
  white-space: nowrap;
}
.dna-ai-chip:hover {
  background: rgba(118, 185, 0, 0.18);
  border-color: rgba(118, 185, 0, 0.5);
}

/* ── Starter chips ────────────────────────────────────────────────────── */
.dna-ai-chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.07);
  background: rgba(0,0,0,0.06);
  transition: opacity 200ms ease, max-height 200ms ease;
  max-height: 200px;
  overflow: hidden;
}
.dna-ai-chips:empty { display: none; }
.dna-ai-chips.dna-chips-hidden {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-top-color: transparent;
  pointer-events: none;
}
:root[saved-theme="light"] .dna-ai-chips {
  border-top-color: rgba(0,0,0,0.07);
  background: rgba(0,0,0,0.03);
}
.dna-ai-chip-starter {
  display: flex;
  align-items: center;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  font-family: var(--bodyFont);
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--gray);
  text-align: left;
  transition: color 150ms, background 150ms, border-color 150ms;
  outline: none;
  word-break: break-word;
}
.dna-ai-chip-starter:hover {
  color: var(--dark);
  background: rgba(118, 185, 0, 0.1);
  border-color: rgba(118, 185, 0, 0.35);
}
:root[saved-theme="light"] .dna-ai-chip-starter {
  background: rgba(0,0,0,0.04);
  border-color: rgba(0,0,0,0.08);
}
:root[saved-theme="light"] .dna-ai-chip-starter:hover {
  background: rgba(118, 185, 0, 0.1);
  border-color: rgba(118, 185, 0, 0.4);
}
@media (max-width: 640px) {
  .dna-ai-chips { grid-template-columns: 1fr; }
}

/* ── Input row ────────────────────────────────────────────────────────── */
.dna-ai-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.875rem;
  border-top: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  background: rgba(255,255,255,0.02);
}
:root[saved-theme="light"] .dna-ai-input-row {
  border-top-color: rgba(0,0,0,0.07);
  background: rgba(0,0,0,0.02);
}
.dna-ai-input {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  outline: none;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: var(--dark);
  font-family: var(--bodyFont);
  caret-color: #76b900;
  transition: border-color 150ms, background 150ms;
  min-width: 0;
}
.dna-ai-input:focus {
  border-color: rgba(118, 185, 0, 0.4);
  background: rgba(255,255,255,0.07);
}
:root[saved-theme="light"] .dna-ai-input {
  background: rgba(0,0,0,0.04);
  border-color: rgba(0,0,0,0.09);
}
:root[saved-theme="light"] .dna-ai-input:focus {
  background: rgba(0,0,0,0.06);
  border-color: rgba(118, 185, 0, 0.5);
}
.dna-ai-input::placeholder { color: var(--gray); opacity: 0.55; }

.dna-ai-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #76b900;
  color: #09090b;
  cursor: pointer;
  transition: opacity 150ms, transform 120ms, box-shadow 150ms;
  outline: none;
  padding: 0;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(118, 185, 0, 0.4);
}
.dna-ai-send:hover {
  opacity: 0.9;
  transform: scale(1.06);
  box-shadow: 0 4px 18px rgba(118, 185, 0, 0.55);
}
.dna-ai-send:active { transform: scale(0.94); }
.dna-ai-send:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

/* Mobile / tablet */
@media (max-width: 640px) {
  #dna-ai-chat {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 1rem;
    width: auto;
  }
  .dna-ai-panel {
    /* Cover screen height but cap so it never overflows above the fold */
    width: 100% !important;
    height: min(520px, calc(100dvh - 5rem)) !important;
    right: 0;
    border-radius: 20px 20px 16px 16px;
    /* When soft keyboard opens, dvh shrinks → panel shrinks too (no blank space) */
  }
  .dna-ai-input {
    /* Prevent iOS zoom on focus (font must be ≥16px) */
    font-size: 16px;
  }
}

/* ── Shader canvas background ─────────────────────────────────────────── */
.dna-ai-canvas {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  border-radius: 24px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.45;
  mix-blend-mode: lighten;
}
/* light/dark palette + opacity handled by JS (applyTheme in ai-chat.inline.ts) */
/* All panel content must sit above the canvas */
.dna-ai-panel > *:not(.dna-ai-canvas) { position: relative; z-index: 1; }

/* ── Model toggles ────────────────────────────────────────────────────── */
.dna-ai-model-toggles {
  display: flex;
  gap: 0.3rem;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  background: rgba(0,0,0,0.08);
}
:root[saved-theme="light"] .dna-ai-model-toggles {
  border-bottom-color: rgba(0,0,0,0.07);
  background: rgba(0,0,0,0.02);
}
.dna-ai-model-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: 0.28rem 0.25rem;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.07);
  background: transparent;
  cursor: pointer;
  outline: none;
  transition: color 150ms, background 150ms, border-color 150ms;
  line-height: 1.2;
}
.dna-ai-model-btn:hover {
  background: rgba(255,255,255,0.05);
}
:root[saved-theme="light"] .dna-ai-model-btn:hover {
  background: rgba(0,0,0,0.05);
}
.dna-ai-model-btn--active {
  color: #76b900 !important;
  background: rgba(118,185,0,0.1) !important;
  border-color: rgba(118,185,0,0.3) !important;
}
.dna-ai-model-name {
  font-family: var(--codeFont);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--dark);
}
.dna-ai-model-btn--active .dna-ai-model-name { color: #76b900; }
.dna-ai-model-hint {
  font-family: var(--codeFont);
  font-size: 8px;
  letter-spacing: 0.02em;
  color: var(--gray);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ── Resize handles ───────────────────────────────────────────────────── */
.dna-ai-resize-top,
.dna-ai-resize-left {
  position: absolute;
  z-index: 20;
  transition: background 150ms;
}
.dna-ai-resize-top {
  top: 0; left: 8px; right: 8px;
  height: 6px;
  cursor: ns-resize;
  border-radius: 24px 24px 0 0;
}
.dna-ai-resize-left {
  left: 0; top: 8px; bottom: 8px;
  width: 6px;
  cursor: ew-resize;
  border-radius: 24px 0 0 24px;
}
.dna-ai-resize-top:hover,
.dna-ai-resize-top.dna-dragging {
  background: rgba(118, 185, 0, 0.25);
}
.dna-ai-resize-left:hover,
.dna-ai-resize-left.dna-dragging {
  background: rgba(118, 185, 0, 0.25);
}
`

  return AiChat
}) satisfies QuartzComponentConstructor
