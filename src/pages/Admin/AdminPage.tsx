import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { AdminLogin } from './components/AdminLogin'
import { AdminShell } from './components/AdminShell'
import { useAdminAuth } from './useAdminAuth'
import { AdminAuthContext } from './useAdminContext'

export function AdminPage() {
  const auth = useAdminAuth()

  return (
    <PageLayout>
      <PageHeader title="Admin" />
      {auth.token === null ? (
        <AdminLogin auth={auth} />
      ) : (
        <AdminAuthContext.Provider value={auth}>
          <AdminShell />
        </AdminAuthContext.Provider>
      )}
    </PageLayout>
  )
}
