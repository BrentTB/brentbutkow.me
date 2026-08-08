export const copy = {
  title: 'Your privacy choices',
  detail: 'We and our 812 partners would like to store cookies on your device.',
  accept: 'Accept all',
  reject: 'Reject all',
  quiet: 'Both buttons work. One of them works now.',
  preparing: (seconds: string) => `Preparing your choices… ${seconds}s`,
  ready: 'Reject is ready. Press it again.',
  accepted: (presses: number) =>
    presses === 1 ? 'Accepted. That took one press.' : `Accepted. That took ${presses} presses.`,
  rejected: (presses: number) =>
    presses === 1 ? 'Rejected. That took one press.' : `Rejected. That took ${presses} presses.`,
}
