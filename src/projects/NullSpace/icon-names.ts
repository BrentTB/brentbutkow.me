// Identifiers for the game's inline-SVG icons. Stored on ability `meta.icon`
// and passed to the <Icon> component, which owns the actual SVG paths. Lives at
// the game root (not under components/) so the engine ability files can name an
// icon without importing React — same way they already import from ./data.
export const IconName = {
  pause: 'pause',
  fullscreen: 'fullscreen',
  exitFullscreen: 'exitFullscreen',
  meteorite: 'meteorite',
  meteor: 'meteor',
  blackHole: 'blackHole',
  rocket: 'rocket',
  shield: 'shield',
  sun: 'sun',
  helper: 'helper',
  telekinesis: 'telekinesis',
  solarFlare: 'solarFlare',
  shieldRegen: 'shieldRegen',
  escape: 'escape',
  repulse: 'repulse',
  cometStorm: 'cometStorm',
  bullet: 'bullet',
  laser: 'laser',
  missile: 'missile',
  ricochet: 'ricochet',
  nuke: 'nuke',
  radiation: 'radiation',
  chainLightning: 'chainLightning',
  gravityLure: 'gravityLure',
  overdrive: 'overdrive',
  hypnosis: 'hypnosis',
  piedPiper: 'piedPiper',
} as const

export type IconName = (typeof IconName)[keyof typeof IconName]
