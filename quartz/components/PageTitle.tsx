import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir}>
        <span class="page-title-brace">{"{"}</span>
        <span class="page-title-text">{title.toUpperCase()}</span>
        <span class="page-title-brace">{"}"}</span>
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 0.875rem;
  margin: 0;
  font-family: var(--codeFont);
  letter-spacing: 0.08em;
}

.page-title a {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  text-decoration: none;
  font-weight: 400;
  background: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  line-height: normal !important;
}

.page-title-brace {
  color: #76b900;
  font-weight: 600;
}

.page-title-text {
  color: var(--dark);
  letter-spacing: 0.1em;
}

.page-title a:hover .page-title-text {
  color: var(--secondary);
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
