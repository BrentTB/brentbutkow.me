import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'

function App() {
  return (
    <div className="page">
      <div className="card">
        <p className="eyebrow">Welcome all...</p>
        <h1>Hello, I am Brent Butkow</h1>
        <p className="subtitle">Building things on the web one project at a time.</p>
      </div>
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
