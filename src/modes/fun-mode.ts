const FUN_MODE_CLASS = 'fun-mode'

export const isFunModeEnabled = () => {
  if (typeof localStorage === 'undefined') return false
  const saved = localStorage.getItem(FUN_MODE_CLASS)
  return saved === 'true'
}

export const enableFunMode = () => {
  document.documentElement.classList.add(FUN_MODE_CLASS)
  localStorage.setItem(FUN_MODE_CLASS, 'true')
}

export const disableFunMode = () => {
  document.documentElement.classList.remove(FUN_MODE_CLASS)
  localStorage.removeItem(FUN_MODE_CLASS)
}
