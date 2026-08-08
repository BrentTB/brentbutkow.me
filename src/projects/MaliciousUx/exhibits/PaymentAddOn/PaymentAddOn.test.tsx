import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ADD_ON_PRICE, copy, PLAN_PRICE } from './data'
import { PaymentAddOn } from './PaymentAddOn'

afterEach(cleanup)

const goToConfirm = () => fireEvent.click(screen.getByRole('button', { name: copy.continue }))
const pay = () => fireEvent.click(screen.getByRole('button', { name: copy.pay }))

describe('PaymentAddOn', () => {
  it('shows only the plan price while choosing', () => {
    render(<PaymentAddOn />)
    expect(screen.getByText(copy.planPrice)).toBeTruthy()
  })

  it('arrives at the confirmation with the extra already ticked', () => {
    render(<PaymentAddOn />)
    goToConfirm()

    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  })

  it('charges the inflated total to anyone who does not read the confirmation', () => {
    render(<PaymentAddOn />)
    goToConfirm()
    pay()

    expect(screen.getByText(copy.paid(PLAN_PRICE + ADD_ON_PRICE))).toBeTruthy()
  })

  it('charges the plan alone once the extra is unticked', () => {
    render(<PaymentAddOn />)
    goToConfirm()
    fireEvent.click(screen.getByRole('checkbox'))
    pay()

    expect(screen.getByText(copy.paid(PLAN_PRICE))).toBeTruthy()
  })

  /** The museum shows a saved card; it never puts up something that could be mistaken for a real one. */
  it('asks for no payment details of any kind', () => {
    render(<PaymentAddOn />)
    goToConfirm()

    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.getByText(copy.card)).toBeTruthy()
  })

  it('re-ticks the extra when the flow is run again', () => {
    render(<PaymentAddOn />)
    goToConfirm()
    fireEvent.click(screen.getByRole('checkbox'))
    pay()
    fireEvent.click(screen.getByRole('button', { name: copy.again }))
    goToConfirm()

    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  })
})
