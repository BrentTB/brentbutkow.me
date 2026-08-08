import { ExhibitCopy, ExhibitId, Wing } from './malicious-ux.types'

/**
 * The catalogue: page copy, wall labels, and the numbers that decide how nasty each specimen is.
 * A specimen's own microcopy — its button labels, its fake legalese — lives beside the widget in its
 * exhibit file, because the words and the behaviour are the same joke.
 */

export const pageCopy = {
  title: 'Malicious UX',
  tagline:
    'A collection of interfaces that were built to work against you. All of them are live, so feel free to poke at them.',
  taglineFun:
    'Every interface in here was put together by someone who did not like you very much, and they all work exactly as intended.',
  admission: (specimens: number) =>
    `Free entry · ${specimens} ${specimens === 1 ? 'specimen' : 'specimens'} · please touch them`,
  planTitle: 'Floor plan',
  promiseTitle: 'Accessibility notice',
  promise:
    "None of this fights a keyboard. If you tab to a control and press enter it'll do whatever its label says, because the cursor is the only thing being punished here (screen readers get the boring version too).",
  closingTitle: 'On the way out',
  closing:
    'None of these were invented for this page. Every one of them is running on a site you used this week, and somebody signed each one off knowing full well what it did.',
} as const

export const wingCopy: Record<Wing, { number: string; title: string; blurb: string }> = {
  [Wing.consent]: {
    number: 'Wing I',
    title: 'Consent',
    blurb: 'Questions where the answer was settled before you got here.',
  },
  [Wing.state]: {
    number: 'Wing II',
    title: 'Memory',
    blurb: 'Settings that agree with you right up until you look away.',
  },
  [Wing.input]: {
    number: 'Wing III',
    title: 'Input',
    blurb: 'Fields that go out of their way to make a simple answer difficult.',
  },
  [Wing.time]: {
    number: 'Wing IV',
    title: 'Time',
    blurb: 'Waiting that somehow only ever lands on your end of things.',
  },
  [Wing.exit]: {
    number: 'Wing V',
    title: 'Exits',
    blurb: 'Signing up took one click, but getting out is going to take a while.',
  },
}

export type Hostility = {
  /** How close the cursor gets to a fleeing control before it hops, in pixels. */
  evadeRadius: number
  /** How far one hop carries it, in pixels. Short enough that chasing it is a game you can win. */
  hopDistance: number
  /** How long a dismissed banner stays dismissed. */
  bannerReviveMs: number
  /** How long the reject button thinks before it will accept a press. */
  rejectDelayMs: number
  /** How long the session nag waits before asking again. */
  nagIntervalMs: number
}

/** Tuning for the hostile behaviours. Fun mode turns everything up; the pattern stays the same. */
export const HOSTILITY: Hostility = {
  evadeRadius: 78,
  hopDistance: 64,
  bannerReviveMs: 15_000,
  rejectDelayMs: 5_000,
  nagIntervalMs: 20_000,
}

const HOSTILITY_FUN: Hostility = {
  evadeRadius: 110,
  hopDistance: 96,
  bannerReviveMs: 8_000,
  rejectDelayMs: 8_000,
  nagIntervalMs: 9_000,
}

export const hostilityFor = (isFunMode: boolean): Hostility =>
  isFunMode ? HOSTILITY_FUN : HOSTILITY

export const placards: Record<ExhibitId, ExhibitCopy> = {
  [ExhibitId.fleeingNo]: {
    name: 'The fleeing No',
    crime: 'Answer the question. Either button works, if you can catch it.',
    why: "A choice you cannot physically click isn't really a choice, but the dialog still logs that it asked you, and whoever reads that log later will see a yes.",
    seenAt: 'Cookie walls, exit prompts, and anything with a prize wheel attached.',
  },
  [ExhibitId.buriedConsent]: {
    name: 'The consent you already gave',
    crime: 'One box, already ticked, four paragraphs down.',
    why: 'Most people go with whatever the default happens to be, so a box that starts ticked has answered on their behalf. Untick this one and watch where the agreement ends up instead.',
    seenAt: 'Newsletter signups, account creation, and every airline that has ever sold insurance.',
  },
  [ExhibitId.swappedLabels]: {
    name: 'Cancel means confirm',
    crime:
      'The dangerous button is dressed up as the safe default, and they trade places as you reach.',
    why: 'People aim at shape and colour long before they read the word, so swapping the two lets the muscle memory from every honest dialog you have ever used do the work.',
    seenAt: 'Cancellation flows, uninstallers, and any screen trying to hang onto your discount.',
  },
  [ExhibitId.doubleNegative]: {
    name: 'Neither of these sentences',
    crime: 'Two options, but reading them twice will not help.',
    why: 'A sentence you cannot untangle turns the choice into a guess, and the guess was written by the people who stand to gain from it. Stacking the negations also keeps the wording defensible if a regulator ever asks about it.',
    seenAt: 'Cookie preference centres, insurance add-ons, and charity signup pages.',
  },
  [ExhibitId.fakeClose]: {
    name: 'The X that is not',
    crime: 'Close the popup and meet the next one.',
    why: 'The close button is the one control people press without reading anything first, so spending that trust on a second advert costs almost nothing. And unfortunately it works over and over again.',
    seenAt: 'News sites, mobile games, and anything trying to get you to install an app.',
  },
  [ExhibitId.paymentAddOn]: {
    name: 'The last-step extra',
    crime: 'One box, already ticked, on the screen where you stopped paying attention.',
    why: 'By the time you reach the confirmation the decision feels made, so the total gets glanced at rather than checked. Anything added here is going onto the bill of someone who has already stopped reading.',
    seenAt: 'Airline checkouts, ticket sites, and domain registrars.',
  },
  [ExhibitId.healingToggle]: {
    name: 'The setting that heals',
    crime: 'Turn it off, scroll away, and come back.',
    why: 'Nobody goes back to double-check a switch they have already set, so flipping it back while it is off screen costs them nothing and gets the setting they wanted anyway.',
    seenAt: 'Ad personalisation, usage-data sharing, and any setting that survives an update.',
  },
  [ExhibitId.immortalBanner]: {
    name: 'The immortal banner',
    crime: 'Save your preferences, then wait.',
    why: 'Saying no is supposed to be as easy as saying yes, otherwise no was never really on offer - but if it asks often enough, sooner or later you will click the wrong thing.',
    seenAt: 'Cookie banners, notification prompts, and rate-this-app nags.',
  },
  [ExhibitId.pasteProofPassword]: {
    name: 'Paste-proof password',
    crime: 'Type all 32 characters by hand, but you only get one second to check them.',
    why: 'Blocking paste stops a password manager rather than an attacker, which leaves the field safest for the people still reusing one password everywhere.',
    seenAt: 'Banks. Almost exclusively banks.',
  },
  [ExhibitId.lateRules]: {
    name: 'The rules arrive late',
    crime: 'Meet every requirement and it will think of another one.',
    why: 'The whole policy is sitting there in the code the entire time, and you only ever get shown the part of it you have already walked into. The only way to find out about a rule is to break it first.',
    seenAt: 'Bank signups, corporate SSO, and password resets at two in the morning.',
  },
  [ExhibitId.digitEater]: {
    name: 'The helpful phone field',
    crime: 'It formats as you type, but it also gets hungry.',
    why: 'A field that rewrites your input while you are looking down at the keyboard gets to hide its own mistakes, so the number ends up looking perfectly reasonable and reaching nobody.',
    seenAt: 'Checkouts and delivery forms.',
  },
  [ExhibitId.unsortedCountries]: {
    name: 'Every country, unsorted',
    crime: 'All of them, in no useful order, with no search box.',
    why: 'Very few people are going to skim two hundred options, so most give up and keep whichever one was sitting there when they arrived.',
    seenAt: 'Shipping forms and tax settings, mostly.',
  },
  [ExhibitId.birthdaySpinners]: {
    name: 'Date of birth, three spinners',
    crime: 'It starts at 1700, so get scrolling.',
    why: 'Every extra second a form takes means fewer people finish it, which is the whole point if the site would rather you gave up before reaching the discount.',
    seenAt: 'Age gates, insurance quotes, and alcohol delivery.',
  },
  [ExhibitId.selfClearingForm]: {
    name: 'The self-clearing form',
    crime: 'One field was wrong, so all of them are gone.',
    why: "Throwing away good input to report a bad one is a decision someone made on purpose. It also puts people off trying a second time, which makes the lack of submissions look like the users' choice, not the form's.",
    seenAt: 'Government portals, job applications, and anything built in 2004.',
  },
  [ExhibitId.patientReject]: {
    name: 'Patient reject',
    crime: 'Accepting is instant, but rejecting has to sit and think about it first.',
    why: 'There is no need to hide anything or word it strangely when only one of the two answers respects your time. On paper the options are identical.',
    seenAt: 'Consent managers, "no thanks" links, and download pages.',
  },
  [ExhibitId.eagerAd]: {
    name: 'The eager advert',
    crime: 'It arrives exactly where you were about to click.',
    why: 'Content that loads late and shoves the layout around gets clicked, and every metric the advertiser looks at will record that click as genuine.',
    seenAt: 'News articles, recipe blogs, and mobile everything.',
  },
  [ExhibitId.popupGauntlet]: {
    name: 'The reading experience',
    crime: 'Scroll the article and something turns up every time you make progress.',
    why: 'The interruptions are timed to your reading rather than to a clock, so the further into the article you get, the more you have to fight the site itself.',
    seenAt: 'Recipe blogs, local news, and whatever a search result drops you on.',
  },
  [ExhibitId.stillThere]: {
    name: 'Are you still there?',
    crime: 'It asks, but answering only starts the clock again.',
    why: 'A dialog on a fixed timer teaches you to dismiss it without reading, so the one time it says something that actually mattered, you will have already clicked past it.',
    seenAt: 'Streaming services, banking sessions, and online exams.',
  },
  [ExhibitId.unsubscribeFunnel]: {
    name: 'The unsubscribe funnel',
    crime: 'Five screens stand between you and the exit, and you are told about none of them.',
    why: 'Each screen has a perfectly good excuse on its own - a confirmation, a survey, an offer - and stacked together they turn leaving into something you have to really mean.',
    seenAt: 'Gyms, streaming services, and anything with a retention team.',
  },
  [ExhibitId.unsubscribeSlog]: {
    name: 'One at a time, please',
    crime: 'Unsubscribing is easy, until you have to do it nine times in a row.',
    why: 'Nothing here refuses you anything, so none of it looks like a dark pattern at all. The entire cost is the time and effort required, while a single button can send you back to the start.',
    seenAt:
      'Retail newsletters, university mailing lists, and anything you handed an email to once.',
  },
  [ExhibitId.invisibleUnsubscribe]: {
    name: 'The link that is technically there',
    crime: 'The unsubscribe link is on this page, somewhere.',
    why: 'The rules tend to require that the link exists rather than that anybody can find it, and grey text on a white background at six pixels fulfils all the requirements. If you can\'t find it, "tab" will be your best friend here.',
    seenAt: 'The bottom of every marketing email ever sent.',
  },
  [ExhibitId.backButtonTrap]: {
    name: 'The back-button trap',
    crime: 'Leaving takes you back to where you already are.',
    why: 'Back is a promise the browser makes rather than the site, so filling history with fake steps breaks the one escape route that every user believes they have.',
    seenAt: 'Content farms, quiz sites, and paywalls.',
  },
}
