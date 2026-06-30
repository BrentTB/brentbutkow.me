// Admin dashboard sections. Values double as the `?tab=` query-param value — no magic strings.
export const AdminTab = {
  overview: 'overview',
  messages: 'messages',
  subscriptions: 'subscriptions',
  nullspace: 'nullspace',
} as const
export type AdminTab = (typeof AdminTab)[keyof typeof AdminTab]

export function isAdminTab(value: string): value is AdminTab {
  return (Object.values(AdminTab) as string[]).includes(value)
}
