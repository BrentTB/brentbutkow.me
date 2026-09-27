import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './index.scss'

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App />
  </StrictMode>
)
