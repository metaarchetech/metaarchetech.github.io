document.addEventListener("nav", () => {
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
})
