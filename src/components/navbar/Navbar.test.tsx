import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { Navbar } from './Navbar'
import styles from './Navbar.module.scss'
import { FunModeContext } from '../../contexts/useFunMode'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <FunModeContext.Provider value={{ isFunMode: false, setIsFunMode: () => {} }}>
        <Navbar />
      </FunModeContext.Provider>
    </MemoryRouter>
  )
}

describe('Navbar mobile menu — no close animation before first open', () => {
  afterEach(cleanup)

  it('keeps menu transitions off on load, enabling them only once the menu is opened', () => {
    renderNavbar()
    const header = screen.getByRole('banner')
    expect(header.classList.contains(styles.menuAnimated)).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(header.classList.contains(styles.menuAnimated)).toBe(true)

    // Closing keeps them on so the reverse stagger plays.
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(header.classList.contains(styles.menuAnimated)).toBe(true)
  })
})
