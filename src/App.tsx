import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Router from './routes/Router'
import styles from './App.module.scss'
import Navbar from './components/navbar/Navbar'
import Footer from './components/footer/Footer'
import WaterRipple from './components/effects/WaterRipple'
import { BrowserRouter } from 'react-router-dom'
import { FunModeProvider } from './contexts/FunModeProvider'
import { useFunMode } from './contexts/FunMode'
import { useEffect } from 'react'
import { preloadImages } from './utils/preloadImages'

const enableVercelAnalytics = import.meta.env.ENABLE_VERCEL_ANALYTICS === 'true'
const enableVercelSpeedInsights = import.meta.env.ENABLE_VERCEL_SPEED_INSIGHTS === 'true'

const WaterRippleLayer = () => {
  const { isFunMode } = useFunMode()
  return isFunMode ? <WaterRipple /> : null
}

function App() {
  useEffect(() => {
    preloadImages([
      '/logos/email-no-bg.png',
      '/logos/linkedin-no-bg.png',
      '/logos/github-no-bg.svg',
    ])
  }, [])

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

export default App
