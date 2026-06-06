import { Route, Routes } from 'react-router-dom'
import { Suspense } from 'react'
import { routes } from './routes.config'
import { useDocumentTitle } from './useDocumentTitle'

export function Router() {
  useDocumentTitle()

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
