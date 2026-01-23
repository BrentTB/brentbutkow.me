import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Router from './routes/Router'
import styles from './App.module.css'
import Navbar from './components/Navbar'
import { BrowserRouter } from 'react-router-dom'

function App() {
  const enableVercelAnalytics = true
  const enableVercelSpeedInsights = true

  return (
    <>
      <div className={styles.shell}>
        <BrowserRouter>
          <Navbar />
          <Router />
        </BrowserRouter>
      </div>
      {enableVercelAnalytics && <Analytics />}
      {enableVercelSpeedInsights && <SpeedInsights />}
    </>
  )
}

export default App
