import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
  zoomIdentity,
  select,
  drag,
  zoom,
} from "d3"
import { Text, Graphics, Application, Container, Circle } from "pixi.js"
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, SimpleSlug, getFullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { D3Config } from "../Graph"

type GraphicsInfo = {
  color: string
  gfx: Graphics
  alpha: number
  active: boolean
}

type NodeData = {
  id: SimpleSlug
  text: string
  tags: string[]
} & SimulationNodeDatum

type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

type LinkData = {
  source: NodeData
  target: NodeData
} & SimulationLinkDatum<NodeData>

type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
}

type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
}

const localStorageKey = "graph-visited"
function getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
}

function addToVisited(slug: SimpleSlug) {
  const visited = getVisited()
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

type TweenNode = {
  update: (time: number) => void
  stop: () => void
}

function initBgShader(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
  if (!gl) return null
  const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}`
  const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_time;
uniform vec3 u_colA; uniform vec3 u_colB; uniform float u_bias;
vec3 m3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 m2(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 pm(vec3 x){return m3(((x*34.0)+1.0)*x);}
float sn(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=m2(i);
  vec3 p=pm(pm(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m*=m; m*=m;
  vec3 x2=2.0*fract(p*C.www)-1.0; vec3 h=abs(x2)-0.5; vec3 ox=floor(x2+0.5); vec3 a0=x2-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*sn(p);p*=2.03;a*=0.5;}return v;}
void main(){
  vec2 p=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time*0.03;
  vec2 flow=vec2(fbm(p*0.3+vec2(t,0)),fbm(p*0.3+vec2(0,t)+5.1));
  vec2 q=p+flow*0.5;
  float n=fbm(q*0.35+t*0.7); n+=0.2*fbm(q*0.7-t*0.3);
  n=smoothstep(-0.9,0.9,n);
  vec3 col=mix(u_colA,u_colB,pow(clamp(n,0.0,1.0),u_bias));
  col*=1.0-0.32*length(p);
  col=pow(max(col,0.0),vec3(0.88));
  gl_FragColor=vec4(col,1.0);
}`
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
  const loc = {
    a: gl.getAttribLocation(prog, "a"),
    res: gl.getUniformLocation(prog, "u_res"),
    time: gl.getUniformLocation(prog, "u_time"),
    colA: gl.getUniformLocation(prog, "u_colA"),
    colB: gl.getUniformLocation(prog, "u_colB"),
    bias: gl.getUniformLocation(prog, "u_bias"),
  }
  const palette = () => document.documentElement.getAttribute("saved-theme") === "light"
    ? { colA: [0.92, 0.94, 0.92] as number[], colB: [0.55, 0.78, 0.12] as number[], bias: 0.6 }
    : { colA: [0.01, 0.015, 0.02] as number[], colB: [0.18, 0.36, 0.01] as number[], bias: 2.2 }
  let theme = palette()
  const applyTheme = () => { theme = palette() }
  document.addEventListener("themechange", applyTheme)
  const start = performance.now()
  let rafId = 0
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = Math.floor(canvas.offsetWidth * dpr), h = Math.floor(canvas.offsetHeight * dpr)
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  }
  const render = (now: number) => {
    resize()
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.enableVertexAttribArray(loc.a)
    gl.vertexAttribPointer(loc.a, 2, gl.FLOAT, false, 0, 0)
    gl.uniform2f(loc.res, canvas.width, canvas.height)
    gl.uniform1f(loc.time, (now - start) / 1000)
    gl.uniform3f(loc.colA, theme.colA[0], theme.colA[1], theme.colA[2])
    gl.uniform3f(loc.colB, theme.colB[0], theme.colB[1], theme.colB[2])
    gl.uniform1f(loc.bias, theme.bias)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    rafId = requestAnimationFrame(render)
  }
  return {
    start: () => { if (!rafId) rafId = requestAnimationFrame(render) },
    stop: () => {
      cancelAnimationFrame(rafId); rafId = 0
      document.removeEventListener("themechange", applyTheme)
    },
  }
}

async function renderGraph(graph: HTMLElement, fullSlug: FullSlug) {
  const slug = simplifySlug(fullSlug)
  const visited = getVisited()
  removeAllChildren(graph)

  let {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    enableRadial,
  } = JSON.parse(graph.dataset["cfg"]!) as D3Config

  const data: Map<SimpleSlug, ContentDetails> = new Map(
    Object.entries<ContentDetails>(await fetchData).map(([k, v]) => [
      simplifySlug(k as FullSlug),
      v,
    ]),
  )
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  const validLinks = new Set(data.keys())

  const tweens = new Map<string, TweenNode>()
  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source: source, target: dest })
      }
    }

    if (showTags) {
      const localTags = details.tags
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(("tags/" + tag) as FullSlug))

      tags.push(...localTags.filter((tag) => !tags.includes(tag)))

      for (const tag of localTags) {
        links.push({ source: source, target: tag })
      }
    }
  }

  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      // compute neighbours
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  const nodes = [...neighbourhood].map((url) => {
    const text = url.startsWith("tags/") ? "#" + url.substring(5) : (data.get(url)?.title ?? url)
    return {
      id: url,
      text,
      tags: data.get(url)?.tags ?? [],
    }
  })
  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
      })),
  }

  const isFullPage = !!document.querySelector("article.graph-page")
  const width = isFullPage ? window.innerWidth : graph.offsetWidth
  const height = isFullPage ? window.innerHeight : Math.max(graph.offsetHeight, 250)

  let linkStrength = 1
  let linkWidth = isFullPage ? 2 : 1
  let nodeSizeMult = 1
  // Load saved graph settings from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem("dna-graph-forces") ?? "{}")
    if (saved.repelForce != null) repelForce = +saved.repelForce
    if (saved.centerForce != null) centerForce = +saved.centerForce
    if (saved.linkDistance != null) linkDistance = +saved.linkDistance
    if (saved.linkStrength != null) linkStrength = +saved.linkStrength
    if (saved.fontSize != null) fontSize = +saved.fontSize
    if (saved.opacityScale != null) opacityScale = +saved.opacityScale
    if (saved.linkWidth != null) linkWidth = +saved.linkWidth
    if (saved.nodeSizeMult != null) nodeSizeMult = +saved.nodeSizeMult
  } catch {}

  // we virtualize the simulation and use pixi to actually render it
  const simulation: Simulation<NodeData, LinkData> = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * repelForce))
    .force("center", forceCenter().strength(centerForce))
    .force("link", forceLink(graphData.links).distance(linkDistance).strength(linkStrength))
    .force("collide", forceCollide<NodeData>((n) => nodeRadius(n)).iterations(3))

  const radius = (Math.min(width, height) / 2) * 0.8
  if (enableRadial) simulation.force("radial", forceRadial(radius).strength(0.2))

  // precompute style prop strings as pixi doesn't support css variables
  const cssVars = [
    "--secondary",
    "--tertiary",
    "--gray",
    "--light",
    "--lightgray",
    "--dark",
    "--darkgray",
    "--bodyFont",
  ] as const
  const computedStyleMap = cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key)
      return acc
    },
    {} as Record<(typeof cssVars)[number], string>,
  )

  // PARA folder color palette — mirrors Obsidian graph.json colorGroups
  const folderColors: [string, string][] = [
    ["00-Meta",      "#ffffff"], // white  (rgb 16777215)
    ["01-Projects",  "#60a5fa"], // blue   (rgb  6333946)
    ["02-Areas",     "#34d399"], // green  (rgb  3462041)
    ["03-Products",  "#a78bfa"], // purple (rgb 10980346)
    ["04-Resources", "#fbbf24"], // amber  (rgb 16498468)
    ["05-Archive",   "#9ca3af"], // gray   (rgb 10265519)
  ]

  function getFolderColor(id: string): string | null {
    for (const [prefix, col] of folderColors) {
      if (id.startsWith(prefix)) return col
    }
    return null
  }

  // calculate color
  const color = (d: NodeData) => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return computedStyleMap["--secondary"]
    } else if (d.id.startsWith("tags/")) {
      return computedStyleMap["--tertiary"]
    }
    const fc = getFolderColor(d.id)
    if (fc) return fc
    if (visited.has(d.id)) {
      return computedStyleMap["--tertiary"]
    }
    return computedStyleMap["--gray"]
  }

  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    return ((isFullPage ? 4 : 2) + Math.sqrt(numLinks) * (isFullPage ? 1.8 : 1)) * nodeSizeMult
  }

  let hoveredNodeId: string | null = null
  let hoveredNeighbours: Set<string> = new Set()
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []
  function updateHoverInfo(newHoveredId: string | null) {
    hoveredNodeId = newHoveredId

    if (newHoveredId === null) {
      hoveredNeighbours = new Set()
      for (const n of nodeRenderData) {
        n.active = false
      }

      for (const l of linkRenderData) {
        l.active = false
      }
    } else {
      hoveredNeighbours = new Set()
      for (const l of linkRenderData) {
        const linkData = l.simulationData
        if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
          hoveredNeighbours.add(linkData.source.id)
          hoveredNeighbours.add(linkData.target.id)
        }

        l.active = linkData.source.id === newHoveredId || linkData.target.id === newHoveredId
      }

      for (const n of nodeRenderData) {
        n.active = hoveredNeighbours.has(n.simulationData.id)
      }
    }
  }

  let dragStartTime = 0
  let dragging = false

  function renderLinks() {
    tweens.get("link")?.stop()
    const tweenGroup = new TweenGroup()

    for (const l of linkRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      // with full alpha and the rest with default alpha
      if (hoveredNodeId) {
        alpha = l.active ? 1 : 0.2
      }

      l.color = l.active ? computedStyleMap["--gray"] : computedStyleMap["--lightgray"]
      tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("link", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderLabels() {
    tweens.get("label")?.stop()
    const tweenGroup = new TweenGroup()

    const defaultScale = 1 / scale
    const activeScale = defaultScale * 1.1
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id

      if (hoveredNodeId === nodeId) {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: activeScale, y: activeScale },
            },
            100,
          ),
        )
      } else {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: n.label.alpha,
              scale: { x: defaultScale, y: defaultScale },
            },
            100,
          ),
        )
      }
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("label", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderNodes() {
    tweens.get("hover")?.stop()

    const tweenGroup = new TweenGroup()
    for (const n of nodeRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      if (hoveredNodeId !== null && focusOnHover) {
        alpha = n.active ? 1 : 0.2
      }

      tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("hover", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderPixiFromD3() {
    renderNodes()
    renderLinks()
    renderLabels()
  }

  tweens.forEach((tween) => tween.stop())
  tweens.clear()

  const app = new Application()
  await app.init({
    width,
    height,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgpu",
    resolution: window.devicePixelRatio,
    eventMode: "static",
  })
  graph.appendChild(app.canvas)

  // On the dedicated /graph page, pin the canvas to cover the full viewport
  // so it escapes the overflow:hidden clip from .graph-outer
  if (isFullPage) {
    const c = app.canvas
    c.style.position = "fixed"
    c.style.top = "0"
    c.style.left = "0"
    c.style.width = "100vw"
    c.style.height = "100dvh"
    c.style.zIndex = "0"
  }

  const stage = app.stage
  stage.interactive = false

  const labelsContainer = new Container<Text>({ zIndex: 3, isRenderGroup: true })
  const nodesContainer = new Container<Graphics>({ zIndex: 2, isRenderGroup: true })
  const linkContainer = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  stage.addChild(nodesContainer, labelsContainer, linkContainer)

  for (const n of graphData.nodes) {
    const nodeId = n.id

    const label = new Text({
      interactive: false,
      eventMode: "none",
      text: n.text,
      alpha: isFullPage ? 0.8 : 0,
      anchor: { x: 0.5, y: 1.2 },
      style: {
        fontSize: fontSize * 15,
        fill: computedStyleMap["--dark"],
        fontFamily: computedStyleMap["--bodyFont"],
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    let oldLabelOpacity = 0
    const isTagNode = nodeId.startsWith("tags/")
    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: "static",
      hitArea: new Circle(0, 0, nodeRadius(n)),
      cursor: "pointer",
    })
      .circle(0, 0, nodeRadius(n))
      .fill({ color: isTagNode ? computedStyleMap["--light"] : color(n) })
      .on("pointerover", (e) => {
        updateHoverInfo(e.target.label)
        oldLabelOpacity = label.alpha
        if (!dragging) {
          renderPixiFromD3()
        }
      })
      .on("pointerleave", () => {
        updateHoverInfo(null)
        label.alpha = oldLabelOpacity
        if (!dragging) {
          renderPixiFromD3()
        }
      })

    if (isTagNode) {
      gfx.stroke({ width: 2, color: computedStyleMap["--tertiary"] })
    }

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: color(n),
      alpha: 1,
      active: false,
    }

    nodeRenderData.push(nodeRenderDatum)
  }

  for (const l of graphData.links) {
    const gfx = new Graphics({ interactive: false, eventMode: "none" })
    linkContainer.addChild(gfx)

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      color: computedStyleMap["--lightgray"],
      alpha: 1,
      active: false,
    }

    linkRenderData.push(linkRenderDatum)
  }

  let currentTransform = zoomIdentity
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on("start", function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(1).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged(event) {
          const initPos = event.subject.__initialDragPos
          event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
          event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
        })
        .on("end", function dragended(event) {
          if (!event.active) simulation.alphaTarget(0)
          event.subject.fx = null
          event.subject.fy = null
          dragging = false

          // if the time between mousedown and mouseup is short, we consider it a click
          if (Date.now() - dragStartTime < 500) {
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            window.spaNavigate(new URL(targ, window.location.toString()))
          }
        }),
    )
  } else {
    for (const node of nodeRenderData) {
      node.gfx.on("click", () => {
        const targ = resolveRelative(fullSlug, node.simulationData.id)
        window.spaNavigate(new URL(targ, window.location.toString()))
      })
    }
  }

  if (enableZoom) {
    select<HTMLCanvasElement, NodeData>(app.canvas).call(
      zoom<HTMLCanvasElement, NodeData>()
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([0.25, 4])
        .on("zoom", ({ transform }) => {
          currentTransform = transform
          stage.scale.set(transform.k, transform.k)
          stage.position.set(transform.x, transform.y)

          // zoom adjusts opacity of labels too
          const scale = transform.k * opacityScale
          let scaleOpacity = Math.max((scale - 1) / 3.75, 0)
          const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

          for (const label of labelsContainer.children) {
            if (!activeNodes.includes(label)) {
              label.alpha = scaleOpacity
            }
          }
        }),
    )
  }

  let stopAnimation = false
  function animate(time: number) {
    if (stopAnimation) return
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      if (!x || !y) continue
      n.gfx.position.set(x + width / 2, y + height / 2)
      if (n.label) {
        n.label.position.set(x + width / 2, y + height / 2)
      }
    }

    for (const l of linkRenderData) {
      const linkData = l.simulationData
      l.gfx.clear()
      l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2)
      l.gfx
        .lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2)
        .stroke({ alpha: l.alpha, width: linkWidth, color: l.color })
    }

    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  // ── Full-page /graph UI (left info + right settings) ────────────────────────
  let bgShader: ReturnType<typeof initBgShader> = null

  if (isFullPage) {
    document.getElementById("graph-ui")?.remove()
    document.getElementById("graph-settings-right")?.remove()
    document.getElementById("graph-bg-canvas")?.remove()

    // Shader background canvas
    const bgCanvas = document.createElement("canvas")
    bgCanvas.id = "graph-bg-canvas"
    bgCanvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;"
    document.body.insertBefore(bgCanvas, document.body.firstChild)
    bgShader = initBgShader(bgCanvas)
    bgShader?.start()

    const nodeCount = graphData.nodes.filter((n) => !n.id.startsWith("tags/")).length
    const linkCount = graphData.links.length

    // Left info panel
    const ui = document.createElement("div")
    ui.id = "graph-ui"
    ui.innerHTML = `
      <a href="/" class="graph-ui-back" aria-label="Back to home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Home
      </a>
      <div class="graph-ui-title">Knowledge Graph</div>
      <div class="graph-ui-stats">${nodeCount} nodes · ${linkCount} links</div>
      <div class="graph-ui-legend">
        <div class="graph-ui-legend-item"><span class="graph-ui-dot" style="background:#ffffff;box-shadow:0 0 0 1px var(--lightgray)"></span>Meta</div>
        <div class="graph-ui-legend-item"><span class="graph-ui-dot" style="background:#60a5fa"></span>Projects</div>
        <div class="graph-ui-legend-item"><span class="graph-ui-dot" style="background:#34d399"></span>Areas</div>
        <div class="graph-ui-legend-item"><span class="graph-ui-dot" style="background:#a78bfa"></span>Products</div>
        <div class="graph-ui-legend-item"><span class="graph-ui-dot" style="background:#fbbf24"></span>Resources</div>
        <div class="graph-ui-legend-item"><span class="graph-ui-dot" style="background:#9ca3af"></span>Archive</div>
        <div class="graph-ui-legend-item"><span class="graph-ui-dot" style="background:transparent;border:2px solid var(--tertiary)"></span>Tags</div>
      </div>
      <div class="graph-ui-hint">Scroll to zoom · Drag to pan · Click node to open</div>
    `
    document.body.appendChild(ui)

    // Right settings panel (always visible on desktop, collapsible on mobile)
    const settingsEl = document.createElement("div")
    settingsEl.id = "graph-settings-right"
    settingsEl.innerHTML = `
      <button class="graph-settings-mobile-toggle" id="graph-settings-mobile-toggle">設定 ▾</button>
      <div class="graph-settings-panel" id="graph-settings-panel">
        <div class="graph-settings-section">
          <div class="graph-settings-section-title">外觀設定</div>
          <label class="graph-settings-row">
            <span class="graph-settings-label">文字大小</span>
            <input type="range" id="gs-fontSize" min="0.5" max="3" step="0.1" value="${fontSize.toFixed(1)}">
            <span class="graph-settings-value" id="gs-fontSize-val">${fontSize.toFixed(1)}</span>
          </label>
          <label class="graph-settings-row">
            <span class="graph-settings-label">文字透明度</span>
            <input type="range" id="gs-opacityScale" min="0" max="5" step="0.1" value="${opacityScale.toFixed(1)}">
            <span class="graph-settings-value" id="gs-opacityScale-val">${opacityScale.toFixed(1)}</span>
          </label>
          <label class="graph-settings-row">
            <span class="graph-settings-label">節點尺寸</span>
            <input type="range" id="gs-nodeSizeMult" min="0.25" max="3" step="0.05" value="${nodeSizeMult.toFixed(2)}">
            <span class="graph-settings-value" id="gs-nodeSizeMult-val">${nodeSizeMult.toFixed(2)}</span>
          </label>
          <label class="graph-settings-row">
            <span class="graph-settings-label">連接線寬度</span>
            <input type="range" id="gs-linkWidth" min="0.5" max="5" step="0.25" value="${linkWidth.toFixed(2)}">
            <span class="graph-settings-value" id="gs-linkWidth-val">${linkWidth.toFixed(2)}</span>
          </label>
        </div>
        <div class="graph-settings-section">
          <div class="graph-settings-section-title">強度設定</div>
          <label class="graph-settings-row">
            <span class="graph-settings-label">節點集中強度</span>
            <input type="range" id="gs-centerForce" min="0" max="1" step="0.01" value="${centerForce.toFixed(2)}">
            <span class="graph-settings-value" id="gs-centerForce-val">${centerForce.toFixed(2)}</span>
          </label>
          <label class="graph-settings-row">
            <span class="graph-settings-label">節點互斥強度</span>
            <input type="range" id="gs-repelForce" min="0" max="10" step="0.1" value="${repelForce.toFixed(1)}">
            <span class="graph-settings-value" id="gs-repelForce-val">${repelForce.toFixed(1)}</span>
          </label>
          <label class="graph-settings-row">
            <span class="graph-settings-label">連結強度</span>
            <input type="range" id="gs-linkStrength" min="0" max="1" step="0.01" value="${linkStrength.toFixed(2)}">
            <span class="graph-settings-value" id="gs-linkStrength-val">${linkStrength.toFixed(2)}</span>
          </label>
          <label class="graph-settings-row">
            <span class="graph-settings-label">連接線距離</span>
            <input type="range" id="gs-linkDistance" min="10" max="300" step="5" value="${Math.round(linkDistance)}">
            <span class="graph-settings-value" id="gs-linkDistance-val">${Math.round(linkDistance)}</span>
          </label>
        </div>
        <button class="graph-settings-save" id="graph-settings-save">Save</button>
      </div>
    `
    document.body.appendChild(settingsEl)

    // Mobile toggle (hidden on desktop via CSS)
    document.getElementById("graph-settings-mobile-toggle")!.addEventListener("click", () => {
      const panel = document.getElementById("graph-settings-panel")!
      const btn = document.getElementById("graph-settings-mobile-toggle") as HTMLButtonElement
      const open = panel.classList.toggle("mobile-open")
      btn.textContent = open ? "設定 ▴" : "設定 ▾"
    })

    const wireSlider = (id: string, onInput: (v: number) => void) => {
      const input = document.getElementById(id) as HTMLInputElement | null
      if (!input) return
      const valEl = document.getElementById(id + "-val")
      input.addEventListener("input", () => {
        const v = parseFloat(input.value)
        if (valEl) {
          const dec = input.step.includes(".") ? (input.step.split(".")[1]?.length ?? 1) : 0
          valEl.textContent = dec > 0 ? v.toFixed(dec) : String(Math.round(v))
        }
        onInput(v)
      })
    }

    wireSlider("gs-fontSize", (v) => {
      fontSize = v
      for (const n of nodeRenderData) n.label.style.fontSize = v * 15
    })
    wireSlider("gs-opacityScale", (v) => { opacityScale = v })
    wireSlider("gs-linkWidth", (v) => { linkWidth = v })
    wireSlider("gs-nodeSizeMult", (v) => { nodeSizeMult = v })
    wireSlider("gs-centerForce", (v) => {
      centerForce = v
      ;(simulation.force("center") as any).strength(v)
      simulation.alpha(0.3).restart()
    })
    wireSlider("gs-repelForce", (v) => {
      repelForce = v
      ;(simulation.force("charge") as any).strength(-100 * v)
      simulation.alpha(0.3).restart()
    })
    wireSlider("gs-linkStrength", (v) => {
      linkStrength = v
      ;(simulation.force("link") as any).strength(v)
      simulation.alpha(0.3).restart()
    })
    wireSlider("gs-linkDistance", (v) => {
      linkDistance = v
      ;(simulation.force("link") as any).distance(v)
      simulation.alpha(0.3).restart()
    })

    document.getElementById("graph-settings-save")!.addEventListener("click", () => {
      localStorage.setItem("dna-graph-forces", JSON.stringify({
        repelForce, centerForce, linkDistance, linkStrength,
        fontSize, opacityScale, linkWidth, nodeSizeMult,
      }))
      const btn = document.getElementById("graph-settings-save") as HTMLButtonElement
      btn.textContent = "已儲存 ✓"
      setTimeout(() => { btn.textContent = "Save" }, 1500)
    })
  }

  requestAnimationFrame(animate)
  return () => {
    stopAnimation = true
    app.destroy()
    document.getElementById("graph-ui")?.remove()
    document.getElementById("graph-settings-right")?.remove()
    document.getElementById("graph-bg-canvas")?.remove()
    bgShader?.stop()
  }
}

let localGraphCleanups: (() => void)[] = []
let globalGraphCleanups: (() => void)[] = []

function cleanupLocalGraphs() {
  for (const cleanup of localGraphCleanups) {
    cleanup()
  }
  localGraphCleanups = []
}

function cleanupGlobalGraphs() {
  for (const cleanup of globalGraphCleanups) {
    cleanup()
  }
  globalGraphCleanups = []
}

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  addToVisited(simplifySlug(slug))

  async function renderLocalGraph() {
    cleanupLocalGraphs()
    const localGraphContainers = document.getElementsByClassName("graph-container")
    for (const container of localGraphContainers) {
      localGraphCleanups.push(await renderGraph(container as HTMLElement, slug))
    }
  }

  await renderLocalGraph()
  const handleThemeChange = () => {
    void renderLocalGraph()
  }

  document.addEventListener("themechange", handleThemeChange)
  window.addCleanup(() => {
    document.removeEventListener("themechange", handleThemeChange)
  })

  const containers = [...document.getElementsByClassName("global-graph-outer")] as HTMLElement[]
  async function renderGlobalGraph() {
    const slug = getFullSlug(window)
    for (const container of containers) {
      container.classList.add("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = "1"
      }

      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      registerEscapeHandler(container, hideGlobalGraph)
      if (graphContainer) {
        globalGraphCleanups.push(await renderGraph(graphContainer, slug))
      }
    }
  }

  function hideGlobalGraph() {
    cleanupGlobalGraphs()
    for (const container of containers) {
      container.classList.remove("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = ""
      }
    }
  }

  async function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      const anyGlobalGraphOpen = containers.some((container) =>
        container.classList.contains("active"),
      )
      anyGlobalGraphOpen ? hideGlobalGraph() : renderGlobalGraph()
    }
  }

  const containerIcons = document.getElementsByClassName("global-graph-icon")
  Array.from(containerIcons).forEach((icon) => {
    icon.addEventListener("click", renderGlobalGraph)
    window.addCleanup(() => icon.removeEventListener("click", renderGlobalGraph))
  })

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => {
    document.removeEventListener("keydown", shortcutHandler)
    cleanupLocalGraphs()
    cleanupGlobalGraphs()
  })

  // Auto-open global graph on dedicated /graph page — UI is injected from within renderGraph
  if (simplifySlug(slug) === "graph") {
    await renderGlobalGraph()
  }
})
