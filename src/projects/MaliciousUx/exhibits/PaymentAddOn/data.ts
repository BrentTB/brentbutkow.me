export const PLAN_PRICE = 12
export const ADD_ON_PRICE = 39

/** No card fields anywhere in this exhibit: the museum shows a saved card, it does not ask for one. */
export const copy = {
  chooseHeading: 'Choose your plan',
  plan: 'Acme Standard, billed monthly',
  planPrice: `£${PLAN_PRICE}.00 / month`,
  continue: 'Continue to payment',

  confirmHeading: 'Confirm and pay',
  card: 'Visa ending 4242',
  lineItem: 'Acme Standard',
  addOn: 'Acme Protection Plus, prepaid annually, renews automatically at the standard rate.',
  addOnPrice: `£${ADD_ON_PRICE}.00`,
  total: 'Total due today',
  pay: 'Pay now',
  back: 'Back',

  quiet: 'Pick the plan and go through to the confirmation.',
  atConfirm: 'Check the total before you press it.',
  paid: (amount: number) =>
    amount > PLAN_PRICE
      ? `Charged £${amount}.00. You meant to spend £${PLAN_PRICE}.00.`
      : `Charged £${amount}.00, which is what the plan costs.`,
  again: 'Start over',
}
