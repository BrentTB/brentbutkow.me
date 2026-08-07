import { ExhibitCopy, ExhibitId, Wing } from './malicious-ux.types'

/**
 * The catalogue: page copy, wall labels, and the numbers that decide how nasty each specimen is.
 * A specimen's own microcopy — its button labels, its fake legalese — lives beside the widget in its
 * exhibit file, because the words and the behaviour are the same joke.
 */

export const pageCopy = {
  title: 'Malicious UX',
  tagline:
    'A museum of interfaces built to work against you. Every exhibit is live, so go ahead and touch it.',
  taglineFun:
    'Every interface in here was designed by somebody who hated you, and all of them work perfectly.',
  admission: (specimens: number) => `Admission free · ${specimens} specimens · touching encouraged`,
  promiseTitle: 'Accessibility notice',
  promise:
    'Nothing here fights a keyboard. Tab to any control, press Enter, and it does what its label says. The cursor is the only visitor being punished, and screen readers get the plain version.',
  closingTitle: 'On the way out',
  closing:
    'None of these were invented here. Every one of them is running on a site you used this week, and somebody signed each one off knowing exactly what it did.',
} as const

export const wingCopy: Record<Wing, { number: string; title: string; blurb: string }> = {
  [Wing.consent]: {
    number: 'Wing I',
    title: 'Consent',
    blurb: 'Questions asked in a way that makes the answer a formality.',
  },
  [Wing.state]: {
    number: 'Wing II',
    title: 'Memory',
    blurb: 'Settings that agree with you until you stop watching them.',
  },
  [Wing.input]: {
    number: 'Wing III',
    title: 'Input',
    blurb: 'Fields that make giving the right answer harder than giving up.',
  },
  [Wing.time]: {
    number: 'Wing IV',
    title: 'Time',
    blurb: 'Friction spent on your side of the transaction, never theirs.',
  },
}

export type Hostility = {
  /** How close the cursor gets to a fleeing control before it bolts, in pixels. */
  evadeRadius: number
  /** Dodges before the fleeing button gives up and swaps places with the other one. */
  dodgesBeforeSwap: number
  /** How long a dismissed banner stays dismissed. */
  bannerReviveMs: number
  /** How long the reject button thinks before it will accept a press. */
  rejectDelayMs: number
  /** How long the session nag waits before asking again. */
  nagIntervalMs: number
}

/** Tuning for the hostile behaviours. Fun mode turns everything up; the pattern stays the same. */
export const HOSTILITY: Hostility = {
  evadeRadius: 90,
  dodgesBeforeSwap: 3,
  bannerReviveMs: 15_000,
  rejectDelayMs: 5_000,
  nagIntervalMs: 20_000,
}

const HOSTILITY_FUN: Hostility = {
  evadeRadius: 150,
  dodgesBeforeSwap: 2,
  bannerReviveMs: 8_000,
  rejectDelayMs: 8_000,
  nagIntervalMs: 9_000,
}

export const hostilityFor = (isFunMode: boolean): Hostility =>
  isFunMode ? HOSTILITY_FUN : HOSTILITY

export const placards: Record<ExhibitId, ExhibitCopy> = {
  [ExhibitId.fleeingNo]: {
    name: 'The fleeing No',
    crime: 'Answer the question. Either button works, if you can reach it.',
    why: 'A choice you cannot physically make is not a choice. The dialog still records that it asked, and the log will say you agreed.',
    seenAt: 'Cookie walls, exit prompts, anything with a prize wheel attached.',
  },
  [ExhibitId.buriedConsent]: {
    name: 'The consent you already gave',
    crime: 'One box, pre-ticked, four paragraphs down.',
    why: 'Whatever the default is, most people give that answer, so a pre-ticked box answers on their behalf. Untick this one and watch where the agreement moves to.',
    seenAt: 'Newsletter signups, account creation, every airline insurance upsell.',
  },
  [ExhibitId.swappedLabels]: {
    name: 'Cancel means confirm',
    crime: 'The safe button is dressed as the dangerous one, and they trade places as you reach.',
    why: 'People aim at shape and colour before they read the word. Swap the two and the muscle memory from ten thousand honest dialogs does the work.',
    seenAt: 'Cancellation flows, uninstallers, "keep my discount" screens.',
  },
  [ExhibitId.unsubscribeFunnel]: {
    name: 'The unsubscribe funnel',
    crime: 'Five screens stand between you and the door. You are told about none of them.',
    why: 'Each screen defends itself alone: a confirmation, a survey, an offer. Stacked, they are a toll on leaving, charged in patience.',
    seenAt: 'Gyms, streaming services, anything with a retention team.',
  },
  [ExhibitId.fakeClose]: {
    name: 'The X that is not',
    crime: 'Close the popup. Meet the next popup.',
    why: 'The close button is the one control people press without reading. Spending that trust on a second ad is cheap, and it works more than once.',
    seenAt: 'News sites, mobile games, install-our-app interstitials.',
  },
  [ExhibitId.healingToggle]: {
    name: 'The setting that heals',
    crime: 'Turn it off, scroll away, come back.',
    why: 'Nobody re-checks a switch they already set. Reverting it while it is off screen costs nothing and quietly buys back the default.',
    seenAt: 'Ad personalisation, usage-data sharing, settings that survive an update.',
  },
  [ExhibitId.immortalBanner]: {
    name: 'The immortal banner',
    crime: 'Save your preferences. Then wait.',
    why: 'Refusing has to be as easy as accepting, or refusing is not really on offer. Asking again until somebody slips is how a no is converted to a yes.',
    seenAt: 'Cookie banners, notification prompts, rate-this-app nags.',
  },
  [ExhibitId.pasteProofPassword]: {
    name: 'Paste-proof password',
    crime: 'For your security, type all 32 characters by hand.',
    why: 'Blocking paste stops a password manager, not an attacker. The field is safest for the people still reusing one password everywhere.',
    seenAt: 'Banks. Almost exclusively banks.',
  },
  [ExhibitId.digitEater]: {
    name: 'The helpful phone field',
    crime: 'It formats as you type. It also gets hungry.',
    why: 'A field that rewrites your input while you are looking at the keyboard hides its own mistakes. The number ends up looking right and reaching nobody.',
    seenAt: 'Checkouts and delivery forms.',
  },
  [ExhibitId.unsortedCountries]: {
    name: 'Every country, unsorted',
    crime: 'All of them, in no particular order, with no search box.',
    why: 'A list you cannot scan is a list you give up on, and giving up means keeping whatever was selected for you.',
    seenAt: 'Shipping forms and tax settings, mostly.',
  },
  [ExhibitId.birthdaySpinners]: {
    name: 'Date of birth, three spinners',
    crime: 'Starts at 1700. Scroll.',
    why: 'Every extra second on a form costs a share of the people filling it in. Point that at the field standing between somebody and their discount.',
    seenAt: 'Age gates, insurance quotes, alcohol delivery.',
  },
  [ExhibitId.selfClearingForm]: {
    name: 'The self-clearing form',
    crime: 'One field was wrong. All of them are gone.',
    why: 'Throwing away valid input to report an invalid one is a choice somebody made. It also suppresses second attempts, which flatters the numbers.',
    seenAt: 'Government portals, job applications, anything built in 2004.',
  },
  [ExhibitId.patientReject]: {
    name: 'Patient reject',
    crime: 'Accept is instant. Reject needs five seconds to think about it.',
    why: 'Same two options, different amounts of friction. Nobody has to hide anything when only one of the answers respects your time.',
    seenAt: 'Consent managers, "no thanks" links, download pages.',
  },
  [ExhibitId.eagerAd]: {
    name: 'The eager advert',
    crime: 'It arrives exactly where you were about to click.',
    why: 'Content that loads late and shifts the layout gets clicked, and by every metric the advertiser checks, the click was real.',
    seenAt: 'News articles, recipe blogs, mobile everything.',
  },
  [ExhibitId.backButtonTrap]: {
    name: 'The back-button trap',
    crime: 'Leaving takes you to where you already are.',
    why: "Back is the browser's promise, not the site's. Stuffing history with fake steps breaks the one escape hatch nobody has to be taught.",
    seenAt: 'Content farms, quiz sites, paywalls.',
  },
  [ExhibitId.stillThere]: {
    name: 'Are you still there?',
    crime: 'It asks. Answering starts the clock again.',
    why: 'A dialog on a fixed timer teaches you to dismiss it unread, which pays off the one time it says something that mattered.',
    seenAt: 'Streaming services, banking sessions, online exams.',
  },
}
