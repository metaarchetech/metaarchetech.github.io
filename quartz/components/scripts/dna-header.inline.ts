// Runs immediately (beforeDOMLoaded) — prevents light/dark flash on refresh
const _userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
document.documentElement.setAttribute("saved-theme", localStorage.getItem("theme") ?? _userPref)

document.addEventListener("nav", () => {
  // ── Theme toggle ─────────────────────────────────────────────────────────

  const emitThemeChange = (theme: "light" | "dark") => {
    const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
      detail: { theme },
    })
    document.dispatchEvent(event)
  }

  const switchTheme = () => {
    const newTheme =
      document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("saved-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    emitThemeChange(newTheme)
  }

  for (const btn of document.getElementsByClassName("dna-theme-toggle")) {
    btn.addEventListener("click", switchTheme)
    window.addCleanup(() => btn.removeEventListener("click", switchTheme))
  }

  // ── Drawer ───────────────────────────────────────────────────────────────

  const drawer = document.querySelector(".sidebar.left") as HTMLElement | null

  const openDrawer = () => {
    if (!drawer) return
    drawer.classList.add("dna-open")
    backdrop.classList.add("dna-open")
    document.body.style.overflow = "hidden"
    for (const btn of document.getElementsByClassName("dna-hamburger")) {
      btn.setAttribute("aria-expanded", "true")
    }
  }

  const closeDrawer = () => {
    if (!drawer) return
    drawer.classList.remove("dna-open")
    backdrop.classList.remove("dna-open")
    document.body.style.overflow = ""
    for (const btn of document.getElementsByClassName("dna-hamburger")) {
      btn.setAttribute("aria-expanded", "false")
    }
  }

  // Ensure backdrop exists (created once, persists across SPA navigations)
  let backdrop = document.getElementById("dna-backdrop") as HTMLElement
  if (!backdrop) {
    backdrop = document.createElement("div")
    backdrop.id = "dna-backdrop"
    backdrop.className = "dna-backdrop"
    document.body.appendChild(backdrop)
  }

  backdrop.addEventListener("click", closeDrawer)
  window.addCleanup(() => backdrop.removeEventListener("click", closeDrawer))

  // Close drawer on SPA navigation (new page loaded → close drawer)
  closeDrawer()

  for (const btn of document.getElementsByClassName("dna-hamburger")) {
    btn.addEventListener("click", openDrawer)
    window.addCleanup(() => btn.removeEventListener("click", openDrawer))
  }

  // ESC closes drawer
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeDrawer()
  }
  document.addEventListener("keydown", handleKeyDown)
  window.addCleanup(() => document.removeEventListener("keydown", handleKeyDown))

  // ── Search button → trigger Quartz search overlay ────────────────────────

  const triggerSearch = () => {
    const searchEl = document.querySelector(".search") as HTMLElement | null
    if (searchEl) searchEl.click()
  }

  for (const btn of document.getElementsByClassName("dna-search-btn")) {
    btn.addEventListener("click", triggerSearch)
    window.addCleanup(() => btn.removeEventListener("click", triggerSearch))
  }

  // ── Resizable right panel ─────────────────────────────────────────────────

  const rightPanel = document.querySelector(".sidebar.right") as HTMLElement | null
  if (rightPanel && window.innerWidth >= 1100) {
    const savedWidth = localStorage.getItem("dna-right-panel-width")
    if (savedWidth) rightPanel.style.setProperty("width", savedWidth, "important")

    let handle = rightPanel.querySelector(".dna-resize-handle") as HTMLElement | null
    if (!handle) {
      handle = document.createElement("div")
      handle.className = "dna-resize-handle"
      handle.setAttribute("aria-hidden", "true")
      rightPanel.prepend(handle)
    }

    let startX = 0
    let startWidth = 0

    const onPointerMove = (e: PointerEvent) => {
      const delta = startX - e.clientX
      const newWidth = Math.max(180, Math.min(520, startWidth + delta))
      rightPanel.style.setProperty("width", newWidth + "px", "important")
    }

    const onPointerUp = (e: PointerEvent) => {
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
      localStorage.setItem("dna-right-panel-width", rightPanel.style.width)
      handle!.releasePointerCapture(e.pointerId)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }

    const onPointerDown = (e: PointerEvent) => {
      startX = e.clientX
      startWidth = rightPanel.offsetWidth
      document.addEventListener("pointermove", onPointerMove)
      document.addEventListener("pointerup", onPointerUp)
      handle!.setPointerCapture(e.pointerId)
      document.body.style.userSelect = "none"
      document.body.style.cursor = "ew-resize"
      e.preventDefault()
    }

    handle.addEventListener("pointerdown", onPointerDown)
    window.addCleanup(() => handle!.removeEventListener("pointerdown", onPointerDown))
  }
})
