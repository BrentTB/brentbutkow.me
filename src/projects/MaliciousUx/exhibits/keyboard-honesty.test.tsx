import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { FunModeProvider } from '../../../contexts/FunModeProvider'
import { BackButtonTrap } from './BackButtonTrap/BackButtonTrap'
import { copy as trapCopy } from './BackButtonTrap/data'
import { BuriedConsent } from './BuriedConsent/BuriedConsent'
import { copy as buriedCopy } from './BuriedConsent/data'
import { FakeClose } from './FakeClose/FakeClose'
import { copy as closeCopy } from './FakeClose/data'
import { HealingToggle } from './HealingToggle/HealingToggle'
import { copy as toggleCopy } from './HealingToggle/data'
import { ImmortalBanner } from './ImmortalBanner/ImmortalBanner'
import { copy as bannerCopy } from './ImmortalBanner/data'
import { InvisibleUnsubscribe } from './InvisibleUnsubscribe/InvisibleUnsubscribe'
import { copy as hiddenCopy } from './InvisibleUnsubscribe/data'
import { PatientReject } from './PatientReject/PatientReject'
import { copy as rejectCopy } from './PatientReject/data'
import { SelfClearingForm } from './SelfClearingForm/SelfClearingForm'
import { copy as formCopy } from './SelfClearingForm/data'
import { StillThere } from './StillThere/StillThere'
import { copy as nagCopy } from './StillThere/data'
import { exhibits } from './registry'

/**
 * The museum's one promise: hostility is aimed at the cursor, and a control reached by Tab and pressed
 * with Enter does what its label says. Two layers guard it. The registry-driven sweep below renders
 * every specimen and checks nothing is hidden from the keyboard; the bespoke blocks that follow prove
 * the both-ways behaviour of each exhibit whose trick depends on which device pressed it.
 */

afterEach(cleanup)

const show = (element: ReactElement) => render(<FunModeProvider>{element}</FunModeProvider>)

/** The ARIA roles a keyboard user tabs through; anything here must be reachable and operable. */
const INTERACTIVE_ROLES = [
  'button',
  'link',
  'checkbox',
  'switch',
  'textbox',
  'combobox',
  'spinbutton',
] as const

describe('every registered exhibit keeps the keyboard in play', () => {
  it.each(
    exhibits.map((exhibit) => [exhibit.accession, exhibit.copy.name, exhibit.component] as const)
  )('%s %s renders and hides no control from the keyboard', (_accession, _name, Component) => {
    show(<Component />)

    const controls = INTERACTIVE_ROLES.flatMap((role) => screen.queryAllByRole(role))
    controls.forEach((control) => {
      // A negative tabindex would pull a control out of the tab order and lock a keyboard user out.
      // (A disabled control is fine: it is a deliberate "not yet", not a trap.)
      expect(control.getAttribute('tabindex')).not.toBe('-1')
    })
  })
})

/** A mouse press: `pointerdown` lands before the click. */
const clickWithPointer = (element: HTMLElement) => {
  fireEvent.pointerDown(element)
  fireEvent.click(element)
}

/** A keyboard press: `keydown` lands before the click the browser synthesises. */
const clickWithKeyboard = (element: HTMLElement) => {
  fireEvent.keyDown(element, { key: 'Enter' })
  fireEvent.click(element)
}

describe('buried consent', () => {
  it('moves the consent elsewhere when a mouse unticks it', () => {
    show(<BuriedConsent />)
    const [marketing, contact] = screen.getAllByRole('checkbox') as HTMLInputElement[]

    fireEvent.pointerDown(marketing)
    fireEvent.click(marketing)

    expect(marketing.checked).toBe(false)
    expect(contact.checked).toBe(true)
  })

  it('takes the answer when a keyboard unticks it', () => {
    show(<BuriedConsent />)
    const [marketing, contact] = screen.getAllByRole('checkbox') as HTMLInputElement[]

    fireEvent.keyDown(marketing, { key: ' ' })
    fireEvent.click(marketing)

    expect(marketing.checked).toBe(false)
    expect(contact.checked).toBe(false)
  })

  it('moves the consent when a mouse presses the label text, not the box', () => {
    show(<BuriedConsent />)
    const [marketing, contact] = screen.getAllByRole('checkbox') as HTMLInputElement[]

    fireEvent.pointerDown(screen.getByText(buriedCopy.marketing))
    fireEvent.click(marketing)

    expect(marketing.checked).toBe(false)
    expect(contact.checked).toBe(true)
  })
})

describe('the fake close', () => {
  it('opens the next popup when the × is clicked', () => {
    show(<FakeClose />)

    clickWithPointer(screen.getByRole('button', { name: closeCopy.closeLabel(0) }))

    expect(screen.getByRole('button', { name: closeCopy.closeLabel(1) })).toBeTruthy()
  })

  it('clears the whole stack when the × is pressed with the keyboard', () => {
    show(<FakeClose />)

    clickWithKeyboard(screen.getByRole('button', { name: closeCopy.closeLabel(0) }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(closeCopy.keyboardCleared)).toBeTruthy()
    // Focus follows the swap instead of falling to the body.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: closeCopy.reopen }))
  })
})

describe('the healing toggle', () => {
  it('holds a setting switched off with the keyboard', () => {
    show(<HealingToggle />)
    const toggle = screen.getByRole('switch')

    clickWithKeyboard(toggle)

    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText(toggleCopy.keyboardHeld)).toBeTruthy()
  })
})

describe('the immortal banner', () => {
  it('stays dismissed when the keyboard saves preferences', () => {
    show(<ImmortalBanner />)

    clickWithKeyboard(screen.getByRole('button', { name: bannerCopy.save }))

    expect(screen.getByText(bannerCopy.keyboardGone)).toBeTruthy()
    expect(screen.getByRole('button', { name: bannerCopy.reset })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: bannerCopy.reset }))
  })
})

describe('the self-clearing form', () => {
  const GOOD_EMAIL = 'ada@example.com'
  const GOOD_PHONE = '(012) 345-6789'

  /** Fills every field, using whatever email and phone the caller wants to be judged on. */
  const fillIn = (email: string, phone: string) => {
    const fields = screen.getAllByRole('textbox') as HTMLInputElement[]
    const [name, , , reason] = fields
    fireEvent.change(name, { target: { value: 'Ada' } })
    fireEvent.change(fields[1], { target: { value: email } })
    fireEvent.change(fields[2], { target: { value: phone } })
    fireEvent.change(reason, { target: { value: 'Billing' } })
    return name
  }

  it('wipes the valid fields when a mouse submits', () => {
    show(<SelfClearingForm />)
    const name = fillIn('not-an-email', GOOD_PHONE)

    clickWithPointer(screen.getByRole('button', { name: formCopy.submit }))

    expect(name.value).toBe('')
    expect(screen.getByText(formCopy.error(formCopy.emailField))).toBeTruthy()
  })

  it('keeps the valid fields when the keyboard submits', () => {
    show(<SelfClearingForm />)
    const name = fillIn('not-an-email', GOOD_PHONE)

    clickWithKeyboard(screen.getByRole('button', { name: formCopy.submit }))

    expect(name.value).toBe('Ada')
    expect(screen.getByText(formCopy.keyboardError(formCopy.emailField))).toBeTruthy()
  })

  it('keeps the fields when Enter submits a field after an earlier mouse submit', () => {
    show(<SelfClearingForm />)
    fillIn('not-an-email', GOOD_PHONE)
    // A mouse submit wipes and would leave the pointer flag set for the next submit.
    clickWithPointer(screen.getByRole('button', { name: formCopy.submit }))

    const name = fillIn('not-an-email', GOOD_PHONE)
    // Enter inside a field submits the form without ever pressing the button.
    fireEvent.submit(name.closest('form') as HTMLFormElement)

    expect(name.value).toBe('Ada')
    expect(screen.getByText(formCopy.keyboardError(formCopy.emailField))).toBeTruthy()
  })

  it('rejects a phone number that is not in its one accepted shape', () => {
    show(<SelfClearingForm />)
    fillIn(GOOD_EMAIL, '012 345 6789')

    clickWithKeyboard(screen.getByRole('button', { name: formCopy.submit }))

    expect(screen.getByText(formCopy.keyboardError(formCopy.phoneField))).toBeTruthy()
  })

  it('accepts the form when both fussy fields are exactly right', () => {
    show(<SelfClearingForm />)
    fillIn(GOOD_EMAIL, GOOD_PHONE)

    clickWithKeyboard(screen.getByRole('button', { name: formCopy.submit }))

    expect(screen.getByText(formCopy.sent)).toBeTruthy()
  })
})

describe('patient reject', () => {
  it('makes a cursor wait before it will reject', () => {
    show(<PatientReject />)

    clickWithPointer(screen.getByRole('button', { name: rejectCopy.reject }))

    expect(screen.queryByText(rejectCopy.rejected(1))).toBeNull()
  })

  it('rejects on the first keyboard press', () => {
    show(<PatientReject />)

    clickWithKeyboard(screen.getByRole('button', { name: rejectCopy.reject }))

    expect(screen.getByText(rejectCopy.rejected(1))).toBeTruthy()
  })
})

describe('the back-button trap', () => {
  it('keeps a cursor on the same article', () => {
    show(<BackButtonTrap />)

    clickWithPointer(screen.getByRole('button', { name: trapCopy.backLabel }))

    expect(screen.getByText(trapCopy.trapped(1))).toBeTruthy()
  })

  it('lets the keyboard out on the first press', () => {
    show(<BackButtonTrap />)

    clickWithKeyboard(screen.getByRole('button', { name: trapCopy.backLabel }))

    expect(screen.getByText(trapCopy.keyboardEscaped)).toBeTruthy()
    expect(screen.getByText(trapCopy.exit)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: trapCopy.again }))
  })

  it('never touches the real browser history', () => {
    const before = window.history.length
    show(<BackButtonTrap />)

    clickWithPointer(screen.getByRole('button', { name: trapCopy.backLabel }))
    clickWithPointer(screen.getByRole('button', { name: trapCopy.backLabel }))

    expect(window.history.length).toBe(before)
  })
})

describe('the near-invisible unsubscribe', () => {
  /**
   * Hiding a control by contrast is the crime, but it stays a real labelled button, so focus reaches it
   * and a screen reader announces it. That is the joke and the reason nobody is locked out.
   */
  it('keeps the link reachable and named, however invisible it is', () => {
    show(<InvisibleUnsubscribe />)

    const link = screen.getByRole('button', { name: hiddenCopy.unsubscribe })
    link.focus()

    expect(document.activeElement).toBe(link)
  })

  it('notices when the keyboard was what found it', () => {
    show(<InvisibleUnsubscribe />)

    clickWithKeyboard(screen.getByRole('button', { name: hiddenCopy.unsubscribe }))

    expect(screen.getByText(hiddenCopy.keyboardFound)).toBeTruthy()
  })

  it('still works for anyone who manages to hit it with a cursor', () => {
    show(<InvisibleUnsubscribe />)

    clickWithPointer(screen.getByRole('button', { name: hiddenCopy.unsubscribe }))

    expect(screen.getByText(hiddenCopy.found)).toBeTruthy()
  })
})

describe('are you still there', () => {
  it('accepts the answer when the keyboard gives it', () => {
    show(<StillThere />)

    clickWithKeyboard(screen.getByRole('button', { name: nagCopy.confirm }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(nagCopy.keyboardGone)).toBeTruthy()
  })
})
