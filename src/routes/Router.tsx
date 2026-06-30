import { Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { routes } from './routes.config'
import { useRouteMeta } from './useRouteMeta'
import { recordVisit } from './navigation-history'

export function Router() {
  const { pathname } = useLocation()
  useRouteMeta()
  useEffect(() => {
    window.scrollTo(0, 0)
    recordVisit(pathname)
  }, [pathname])

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
