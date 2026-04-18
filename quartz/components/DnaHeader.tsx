// @ts-ignore
import dnaHeaderScript from "./scripts/dna-header.inline"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const DnaHeader: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const title = (cfg?.pageTitle ?? "metaarchetech").toUpperCase()

  return (
    <div class="dna-pill-header" aria-label="Site header">
      <div class="dna-pill-inner">
        <a class="dna-wordmark" href="/" aria-label={cfg?.pageTitle ?? "Home"}>
          <span class="dna-brace">{"{"}</span>
          <span class="dna-wordmark-text">{title}</span>
          <span class="dna-brace">{"}"}</span>
        </a>

        <div class="dna-header-right">
          <span class="live-dot" aria-hidden="true" />
          <button class="dna-theme-toggle darkmode" aria-label="Toggle theme">
            <svg
              class="dna-sun-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <svg
              class="dna-moon-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

DnaHeader.beforeDOMLoaded = dnaHeaderScript

DnaHeader.css = `
.dna-pill-header {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 9000;
  pointer-events: none;
}

.dna-pill-inner {
  border-radius: 1rem;
  border: 1px solid var(--c-pill-border, rgba(255,255,255,0.07));
  background: var(--c-pill-bg, rgba(9,9,11,0.6));
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  height: 3rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: auto;
  transition: background 180ms cubic-bezier(0.16,1,0.3,1), border-color 180ms ease;
}

.dna-wordmark {
  font-family: var(--codeFont);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  text-decoration: none;
  background: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  line-height: normal !important;
}

.dna-wordmark:hover {
  color: inherit;
}

.dna-brace {
  color: #76b900;
  font-weight: 600;
}

.dna-wordmark-text {
  color: var(--c-text, #f4f4f5);
  letter-spacing: 0.1em;
}

.dna-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dna-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--c-pill-border, rgba(255,255,255,0.07));
  background: transparent;
  cursor: pointer;
  color: var(--c-text-muted, #71717a);
  transition: color 180ms ease, background 180ms ease;
  outline: none;
  padding: 0;
  flex-shrink: 0;
}

.dna-theme-toggle:hover {
  background: var(--c-glass-bg, rgba(255,255,255,0.035));
  color: var(--c-text, #f4f4f5);
}

/* Dark mode: show sun icon (click → switch to light) */
:root[saved-theme="dark"] .dna-theme-toggle .dna-sun-icon  { display: block; }
:root[saved-theme="dark"] .dna-theme-toggle .dna-moon-icon { display: none; }

/* Light mode / default: show moon icon (click → switch to dark) */
:root .dna-theme-toggle .dna-sun-icon  { display: none; }
:root .dna-theme-toggle .dna-moon-icon { display: block; }
`

export default (() => DnaHeader) satisfies QuartzComponentConstructor
