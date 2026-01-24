import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Router from './routes/Router'
import styles from './App.module.scss'
import Navbar from './components/Navbar'
import { BrowserRouter } from 'react-router-dom'
import { FunModeProvider } from './contexts/FunModeContext'

const enableVercelAnalytics = import.meta.env.ENABLE_VERCEL_ANALYTICS === 'true'
const enableVercelSpeedInsights = import.meta.env.ENABLE_VERCEL_SPEED_INSIGHTS === 'true'

function App() {
  return (
    <>
      <div className={styles.shell}>
        <BrowserRouter>
          <FunModeProvider>
            <Navbar />
            <Router />
          </FunModeProvider>
        </BrowserRouter>
      </div>
      {enableVercelAnalytics && <Analytics />}
      {enableVercelSpeedInsights && <SpeedInsights />}
    </>
  )
}

export default App
