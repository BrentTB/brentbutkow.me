export const copy = {
  heading: 'Request a callback',
  name: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
  phoneHint: 'Must be entered as (012) 345-6789.',
  reason: 'What is this about?',
  submit: 'Send request',
  quiet: 'Fill it in and send it. There are two ways to get this wrong.',
  emailField: 'email address',
  phoneField: 'phone number',
  error: (field: string) => `That ${field} is not valid. Please complete the form again.`,
  keyboardError: (field: string) =>
    `That ${field} is not valid. Everything else is where you left it.`,
  sent: 'Request sent. Nobody will call.',
}
