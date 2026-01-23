import { Route, Routes } from 'react-router-dom'
import { routes } from './routes.config'

function Router() {
  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  )
}

export default Router
