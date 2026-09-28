import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { shouldHydrate } from './should-hydrate'
import './index.scss'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

if (shouldHydrate(container)) hydrateRoot(container, app)
else createRoot(container).render(app)
