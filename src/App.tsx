import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Router } from './routes/Router'
import styles from './App.module.scss'
import { Navbar } from './components/navbar/Navbar'
import { Footer } from './components/footer/Footer'
import { BrowserRouter } from 'react-router-dom'
import { FunModeProvider } from './contexts/FunModeProvider'
import { useFunMode } from './contexts/useFunMode'
import { useWarmApi } from './api/useWarmApi'
import { lazy, Suspense } from 'react'

// WebGL effect is Fun-mode-only and heavy — code-split it out of the initial bundle.
const WaterRipple = lazy(() =>
  import('./components/effects/WaterRipple').then((module) => ({ default: module.WaterRipple }))
)

const enableVercelAnalytics = import.meta.env.ENABLE_VERCEL_ANALYTICS === 'true'
const enableVercelSpeedInsights = import.meta.env.ENABLE_VERCEL_SPEED_INSIGHTS === 'true'

const WaterRippleLayer = () => {
  const { isFunMode } = useFunMode()
  return isFunMode ? (
    <Suspense fallback={null}>
      <WaterRipple />
    </Suspense>
  ) : null
}

export function App() {
  // Warm the backend on first load so its cold start overlaps with browsing.
  useWarmApi()

  return (
    <>
      <div className={styles.shell}>
        <BrowserRouter>
          <FunModeProvider>
            <WaterRippleLayer />
            <Navbar />
            <Router />
          </FunModeProvider>
        </BrowserRouter>
      </div>
      <Footer />
      {enableVercelAnalytics && <Analytics />}
      {enableVercelSpeedInsights && <SpeedInsights />}
    </>
  )
}
