import { Route, Routes } from 'react-router-dom'
import { Suspense } from 'react'
import { routes } from './routes.config'
import { useRouteMeta } from './useRouteMeta'

export function Router() {
  useRouteMeta()

  return (
    <Suspense fallback={null}>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
    </Suspense>
  )
}
