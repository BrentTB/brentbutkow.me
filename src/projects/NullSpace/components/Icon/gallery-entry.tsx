// Dev-only entry for icon-gallery.html (repo root). Renders the live <Icon>
// component so the gallery always reflects the current icons — no regeneration.
// Served by `npm run dev` at /icon-gallery.html; excluded from production builds
// (only index.html is a build entry).
import { createRoot } from 'react-dom/client'
import { Icon, IconName } from './Icon'

const TEXT = '#f3efe7'
const ACCENT = '#e9b872'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <>
      <h1>Null Space — icons (button · text · accent/hover)</h1>
      <div className="grid">
        {Object.values(IconName).map((name) => (
          <div className="tile" key={name}>
            <div className="row">
              <span className="btn">
                <Icon name={name} />
              </span>
              <span className="big" style={{ color: TEXT }}>
                <Icon name={name} />
              </span>
              <span className="big" style={{ color: ACCENT }}>
                <Icon name={name} />
              </span>
            </div>
            <code>{name}</code>
          </div>
        ))}
      </div>
    </>
  )
}
