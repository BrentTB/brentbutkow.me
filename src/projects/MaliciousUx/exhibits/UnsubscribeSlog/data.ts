/** How long each unsubscribe "processes" before it takes. Slow enough to feel, short enough to finish. */
export const UNSUBSCRIBE_MS = 900

export const MAILINGS: readonly string[] = [
  'Acme Weekly',
  'Acme Deals',
  'Acme Product News',
  'Acme Community Digest',
  'Acme Partner Offers',
  'Acme Events Near You',
  'Acme Survey Invitations',
  'Acme Account Tips',
  'Acme Occasional Extras',
]

/**
 * The wait the site imposes to leave, in seconds. Derived from the queue rather than a clock: it is the
 * cost the design chose, not how fast the visitor happened to click.
 */
export const imposedWaitSeconds = (count: number): string =>
  ((count * UNSUBSCRIBE_MS) / 1000).toFixed(1)

export const copy = {
  heading: 'Email preferences',
  detail: 'Manage each subscription separately.',
  unsubscribe: 'Unsubscribe',
  pending: 'Processing…',
  gone: 'Unsubscribed',
  resubscribe: 'Resubscribe to all',
  quiet: (count: number) => `${count} subscriptions. One button each.`,
  waiting: 'Processing. Everything else is locked until it finishes.',
  progress: (left: number) => (left === 1 ? '1 subscription left.' : `${left} subscriptions left.`),
  cleared: (seconds: string) => `All clear. That took ${seconds} seconds.`,
  restored: 'Resubscribed to everything. That took one click and no waiting.',
}
