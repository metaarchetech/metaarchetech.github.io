import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.DnaHeader()],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/metaarchetech/metaarchetech.github.io",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index" && page.fileData.slug !== "graph",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => page.fileData.slug !== "graph",
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => page.fileData.slug !== "graph",
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => page.fileData.slug !== "graph",
    }),
    Component.ConditionalRender({
      component: Component.Graph({
        localGraph: {
          depth: -1,
          scale: 0.8,
          repelForce: 0.6,
          centerForce: 0.2,
          linkDistance: 45,
          fontSize: 0.65,
          opacityScale: 1.2,
          focusOnHover: true,
          showTags: true,
          enableRadial: true,
        },
        globalGraph: undefined,
      }),
      condition: (page) => page.fileData.slug === "graph",
    }),
  ],
  left: [
    Component.Flex({
      components: [
        { Component: Component.Search(), grow: true },
      ],
    }),
    Component.Explorer(),
    Component.GraphLink(),
  ],
  right: [
    Component.ConditionalRender({
      component: Component.Graph({
        localGraph: {
          depth: 2,
          scale: 1.3,
          repelForce: 0.8,
          centerForce: 0.3,
          linkDistance: 50,
          fontSize: 0.7,
          opacityScale: 1.5,
          focusOnHover: true,
          showTags: true,
          enableRadial: false,
        },
        globalGraph: {
          depth: -1,
          scale: 0.7,
          repelForce: 2.5,
          centerForce: 0.15,
          linkDistance: 120,
          fontSize: 0.8,
          opacityScale: 3,
          focusOnHover: true,
          enableRadial: true,
          showTags: true,
        },
      }),
      condition: (page) => page.fileData.slug !== "graph",
    }),
    Component.ConditionalRender({
      component: Component.DesktopOnly(Component.TableOfContents()),
      condition: (page) => page.fileData.slug !== "graph",
    }),
    Component.ConditionalRender({
      component: Component.Backlinks(),
      condition: (page) => page.fileData.slug !== "graph",
    }),
  ],
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.Flex({
      components: [
        { Component: Component.Search(), grow: true },
      ],
    }),
    Component.Explorer(),
    Component.GraphLink(),
  ],
  right: [],
}
