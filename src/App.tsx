import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Router } from './routes/Router'
import styles from './App.module.scss'
import { Navbar } from './components/navbar/Navbar'
import { Footer } from './components/footer/Footer'
import { BrowserRouter } from 'react-router-dom'
import { FunModeProvider } from './contexts/FunModeProvider'
import { useFunMode } from './contexts/useFunMode'
import { lazy, Suspense } from 'react'

// WebGL effect is Fun-mode-only and heavy — code-split it out of the initial bundle.
const WaterRipple = lazy(() =>
  import('./components/effects/WaterRipple').then((module) => ({ default: module.WaterRipple }))
)

const enableVercelAnalytics = import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS === 'true'
const enableVercelSpeedInsights = import.meta.env.VITE_ENABLE_VERCEL_SPEED_INSIGHTS === 'true'

const WaterRippleLayer = () => {
  const { isFunMode } = useFunMode()
  return isFunMode ? (
    <Suspense fallback={null}>
      <WaterRipple />
    </Suspense>
  ) : null
}

export function App() {
  return (
    <BrowserRouter>
      <FunModeProvider>
        <div className={styles.shell}>
          <WaterRippleLayer />
          <Navbar />
          <Router />
        </div>
        <Footer />
        {enableVercelAnalytics && <Analytics />}
        {enableVercelSpeedInsights && <SpeedInsights />}
      </FunModeProvider>
    </BrowserRouter>
  )
}
