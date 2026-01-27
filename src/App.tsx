import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Router from './routes/Router'
import styles from './App.module.scss'
import Navbar from './components/navbar/Navbar'
import Footer from './components/footer/Footer'
import { BrowserRouter } from 'react-router-dom'
import { FunModeProvider } from './contexts/FunModeProvider'

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
      <Footer />
      {enableVercelAnalytics && <Analytics />}
      {enableVercelSpeedInsights && <SpeedInsights />}
    </>
  )
}

export default App
