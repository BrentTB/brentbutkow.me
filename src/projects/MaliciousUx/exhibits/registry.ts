import { ComponentType } from 'react'
import { placards } from '../data'
import { Exhibit, ExhibitId, Wing } from '../malicious-ux.types'
import { BackButtonTrap } from './BackButtonTrap/BackButtonTrap'
import { BirthdaySpinners } from './BirthdaySpinners/BirthdaySpinners'
import { BuriedConsent } from './BuriedConsent/BuriedConsent'
import { DigitEater } from './DigitEater/DigitEater'
import { DoubleNegative } from './DoubleNegative/DoubleNegative'
import { EagerAd } from './EagerAd/EagerAd'
import { FakeClose } from './FakeClose/FakeClose'
import { FleeingNo } from './FleeingNo/FleeingNo'
import { HealingToggle } from './HealingToggle/HealingToggle'
import { ImmortalBanner } from './ImmortalBanner/ImmortalBanner'
import { InvisibleUnsubscribe } from './InvisibleUnsubscribe/InvisibleUnsubscribe'
import { LateRules } from './LateRules/LateRules'
import { PasteProofPassword } from './PasteProofPassword/PasteProofPassword'
import { PatientReject } from './PatientReject/PatientReject'
import { PaymentAddOn } from './PaymentAddOn/PaymentAddOn'
import { PopupGauntlet } from './PopupGauntlet/PopupGauntlet'
import { SelfClearingForm } from './SelfClearingForm/SelfClearingForm'
import { StillThere } from './StillThere/StillThere'
import { SwappedLabels } from './SwappedLabels/SwappedLabels'
import { UnsortedCountries } from './UnsortedCountries/UnsortedCountries'
import { UnsubscribeSlog } from './UnsubscribeSlog/UnsubscribeSlog'
import { UnsubscribeFunnel } from './UnsubscribeFunnel/UnsubscribeFunnel'

const widgets: Record<ExhibitId, ComponentType> = {
  [ExhibitId.fleeingNo]: FleeingNo,
  [ExhibitId.buriedConsent]: BuriedConsent,
  [ExhibitId.swappedLabels]: SwappedLabels,
  [ExhibitId.unsubscribeFunnel]: UnsubscribeFunnel,
  [ExhibitId.fakeClose]: FakeClose,
  [ExhibitId.healingToggle]: HealingToggle,
  [ExhibitId.immortalBanner]: ImmortalBanner,
  [ExhibitId.doubleNegative]: DoubleNegative,
  [ExhibitId.paymentAddOn]: PaymentAddOn,
  [ExhibitId.pasteProofPassword]: PasteProofPassword,
  [ExhibitId.lateRules]: LateRules,
  [ExhibitId.digitEater]: DigitEater,
  [ExhibitId.unsortedCountries]: UnsortedCountries,
  [ExhibitId.birthdaySpinners]: BirthdaySpinners,
  [ExhibitId.selfClearingForm]: SelfClearingForm,
  [ExhibitId.patientReject]: PatientReject,
  [ExhibitId.eagerAd]: EagerAd,
  [ExhibitId.popupGauntlet]: PopupGauntlet,
  [ExhibitId.stillThere]: StillThere,
  [ExhibitId.unsubscribeSlog]: UnsubscribeSlog,
  [ExhibitId.invisibleUnsubscribe]: InvisibleUnsubscribe,
  [ExhibitId.backButtonTrap]: BackButtonTrap,
}

/**
 * The order a visitor walks the museum, and the only place that order is written down. Accession codes
 * come from a specimen's position here, so inserting one in the middle renumbers the rest rather than
 * leaving the catalogue out of step with the wall.
 */
const catalogue: { id: ExhibitId; wing: Wing }[] = [
  { id: ExhibitId.fleeingNo, wing: Wing.consent },
  { id: ExhibitId.buriedConsent, wing: Wing.consent },
  { id: ExhibitId.swappedLabels, wing: Wing.consent },
  { id: ExhibitId.doubleNegative, wing: Wing.consent },
  { id: ExhibitId.fakeClose, wing: Wing.consent },
  { id: ExhibitId.paymentAddOn, wing: Wing.consent },
  { id: ExhibitId.healingToggle, wing: Wing.state },
  { id: ExhibitId.immortalBanner, wing: Wing.state },
  { id: ExhibitId.pasteProofPassword, wing: Wing.input },
  { id: ExhibitId.lateRules, wing: Wing.input },
  { id: ExhibitId.digitEater, wing: Wing.input },
  { id: ExhibitId.unsortedCountries, wing: Wing.input },
  { id: ExhibitId.birthdaySpinners, wing: Wing.input },
  { id: ExhibitId.selfClearingForm, wing: Wing.input },
  { id: ExhibitId.patientReject, wing: Wing.time },
  { id: ExhibitId.eagerAd, wing: Wing.time },
  { id: ExhibitId.popupGauntlet, wing: Wing.time },
  { id: ExhibitId.stillThere, wing: Wing.time },
  { id: ExhibitId.unsubscribeFunnel, wing: Wing.exit },
  { id: ExhibitId.unsubscribeSlog, wing: Wing.exit },
  { id: ExhibitId.invisibleUnsubscribe, wing: Wing.exit },
  { id: ExhibitId.backButtonTrap, wing: Wing.exit },
]

/** The catalogue code for the nth specimen, counting from zero. */
export const accessionFor = (index: number): string => `DP-${String(index + 1).padStart(3, '0')}`

export const exhibits: Exhibit[] = catalogue.map((entry, index) => ({
  ...entry,
  accession: accessionFor(index),
  copy: placards[entry.id],
  component: widgets[entry.id],
}))

/** The specimens in one wing, in catalogue order. */
export const exhibitsInWing = (wing: Wing): Exhibit[] =>
  exhibits.filter((exhibit) => exhibit.wing === wing)
