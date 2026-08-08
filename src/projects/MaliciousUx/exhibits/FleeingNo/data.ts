export const copy = {
  question: 'Do you consent to us sharing your data with 1,400 carefully selected partners?',
  yes: 'Yes, I consent',
  no: 'No',
  chasing: (dodges: number) => {
    if (dodges === 0) return 'Waiting for an answer.'
    return dodges === 1 ? '1 dodge. Keep at it.' : `${dodges} dodges. Keep at it.`
  },
  agreed: 'Recorded: consent given.',
  declined: 'Recorded: consent declined.',
}
