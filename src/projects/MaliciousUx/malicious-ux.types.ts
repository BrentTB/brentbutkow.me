import { ComponentType } from 'react'

/** The four wings of the museum, in the order a visitor walks them. */
export const Wing = {
  consent: 'consent',
  state: 'state',
  input: 'input',
  time: 'time',
  exit: 'exit',
} as const
export type Wing = (typeof Wing)[keyof typeof Wing]

export const ExhibitId = {
  fleeingNo: 'fleeingNo',
  buriedConsent: 'buriedConsent',
  swappedLabels: 'swappedLabels',
  unsubscribeFunnel: 'unsubscribeFunnel',
  fakeClose: 'fakeClose',
  healingToggle: 'healingToggle',
  immortalBanner: 'immortalBanner',
  doubleNegative: 'doubleNegative',
  paymentAddOn: 'paymentAddOn',
  pasteProofPassword: 'pasteProofPassword',
  lateRules: 'lateRules',
  digitEater: 'digitEater',
  unsortedCountries: 'unsortedCountries',
  birthdaySpinners: 'birthdaySpinners',
  selfClearingForm: 'selfClearingForm',
  patientReject: 'patientReject',
  eagerAd: 'eagerAd',
  popupGauntlet: 'popupGauntlet',
  stillThere: 'stillThere',
  unsubscribeSlog: 'unsubscribeSlog',
  invisibleUnsubscribe: 'invisibleUnsubscribe',
  backButtonTrap: 'backButtonTrap',
} as const
export type ExhibitId = (typeof ExhibitId)[keyof typeof ExhibitId]

/** The wall label beside a specimen. Museum voice; the widget does the shouting. */
export type ExhibitCopy = {
  name: string
  /** One line on what the widget does to you. */
  crime: string
  /** Why it is hostile rather than merely annoying — the part worth reading. */
  why: string
  /** Where the visitor has met this in the wild. */
  seenAt: string
}

export type Exhibit = {
  id: ExhibitId
  wing: Wing
  /** Catalogue code on the placard, e.g. `DP-001`. Minted from the exhibit's place in the catalogue. */
  accession: string
  copy: ExhibitCopy
  component: ComponentType
}
