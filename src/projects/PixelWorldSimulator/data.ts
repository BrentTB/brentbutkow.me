import { MaterialId, SimSetting, SimSettings, Tool } from './pixel-world.types'
import { Preset } from './engine/presets'

// Widescreen, and half again as many cells as the 300x200 it started at: the world reads as a place with
// room to build rather than a strip. 16:9 so a fullscreen world fills a typical display exactly.
export const GRID_WIDTH = 400
export const GRID_HEIGHT = 225

export const TICK_RATE = 60

/** Room temperature in °C — where fresh cells start and where every cell slowly drifts back to. */
export const AMBIENT_TEMPERATURE = 20

/**
 * Ticks a single frame may run at 1× speed. It caps catch-up so a backgrounded tab can't come back and
 * simulate a whole second at once, and it stays small because a late frame that fires a burst of ticks
 * reads as a stutter. Speed multiplies it.
 */
export const MAX_TICKS_PER_FRAME = 2

/**
 * A fast-forward speed for watching a world settle without sitting through it: handy for seeing whether a
 * colony survives an hour of ticks, useless for watching anything happen. Off unless
 * `VITE_PIXEL_WORLD_FAST_FORWARD=true`, so it stays a local testing tool rather than shipping.
 *
 * Speed changes nothing about the simulation itself. The loop runs a fixed 60 Hz tick and speed only decides
 * how many of those ticks it runs between one drawn frame and the next, so a world at 5× passes through
 * exactly the states it would at 1× — there are simply fewer frames drawn along the way.
 */
const FAST_FORWARD = import.meta.env.VITE_PIXEL_WORLD_FAST_FORWARD === 'true'

/**
 * How fast the world runs. Slow motion is how you actually watch a reaction happen.
 *
 * The top speed on the page is 2×, not 4×: drawing is capped at the display's refresh rate, so every extra
 * tick per frame is movement you never see happening. At 4× a flame jumped four cells between frames, which
 * reads as stutter rather than speed.
 */
export const SIM_SPEEDS: readonly { label: string; rate: number }[] = [
  { label: '0.25×', rate: 0.25 },
  { label: '0.5×', rate: 0.5 },
  { label: '1×', rate: 1 },
  { label: '2×', rate: 2 },
  ...(FAST_FORWARD ? [{ label: '5×', rate: 5 }] : []),
]
export const DEFAULT_SPEED = 1

/** How often the hovered cell's reading refreshes, in ms. Fast enough to watch a temperature move. */
export const READING_INTERVAL = 100

/**
 * How often the tally of what the world is made of refreshes, in ms. Slower than the readout: counting is a
 * whole pass over the grid, and a column of numbers flickering at ten a second is unreadable anyway.
 */
export const CENSUS_INTERVAL = 250

/** Gap between the tool column and the tally under it, in px. Matches the `gap` the sidebar is laid out with. */
export const SIDEBAR_GAP = 8

/**
 * The shortest the tally is allowed to be, in px: its header plus about three rows. Where the canvas leaves
 * less room than this the panel keeps its three rows and scrolls, because a list you cannot read two entries
 * of is not worth opening.
 */
export const CENSUS_MIN_HEIGHT = 122

/**
 * The colours a tracked row is marked with, handed out in the order rows are marked. Deliberately not the
 * palette's material colours: a marker has to be legible against every swatch it might sit beside, and it is
 * saying "this is the row you asked about" rather than "this is what the stuff looks like".
 */
export const CENSUS_TRACK_COLOURS: readonly string[] = [
  '#f2b34b',
  '#5fb8e6',
  '#e07a9c',
  '#7ed07a',
  '#c58ce6',
  '#e8e05f',
]

/**
 * The coldest and hottest anything in the world is allowed to get. The heat and chill tools clamp to it so
 * neither can run away, and a snapshot arriving from a URL is clamped to it too — an `Int16` holds 32,000°,
 * which no world should.
 */
export const TEMPERATURE_LIMITS = {
  floor: -220,
  ceiling: 1800,
}

/**
 * The longest a shared link's world code may be, in characters, measured rather than guessed. Ready-made
 * worlds deflate to 2,300-4,600, and the same worlds after a minute of running reach 2,700-11,000: an
 * erupting volcano scatters debris across ground that started as clean stone. A world scribbled at random
 * comes to about 15,000.
 *
 * Hence 32,768 rather than the 8,192 this started at: that refused any volcano left to erupt, which is the
 * most worth sharing. A world past the cap is retried without its heat before it is refused, so only a
 * genuinely pathological one — every cell a different material, which measures 83,000 even stripped — is
 * turned away. The cap still bounds what the decoder will accept from a stranger's URL.
 */
export const SNAPSHOT_MAX_CHARS = 32_768

export const BRUSH_RADIUS = {
  min: 0,
  max: 24,
  default: 5,
}

export const MaterialGroup = {
  solids: 'solids',
  powders: 'powders',
  liquids: 'liquids',
  gases: 'gases',
  energy: 'energy',
  life: 'life',
} as const
export type MaterialGroup = (typeof MaterialGroup)[keyof typeof MaterialGroup]

/**
 * The palette in groups, because a single row of thirty-odd swatches is a wall rather than a choice.
 * Order inside each group runs from the everyday to the exotic. Erase sits outside the groups: it is a
 * tool, not a material, and it should never be a tab away.
 */
export const MATERIAL_GROUPS: readonly {
  group: MaterialGroup
  label: string
  materials: readonly MaterialId[]
}[] = [
  {
    group: MaterialGroup.solids,
    label: 'Solids',
    materials: [
      MaterialId.stone,
      MaterialId.wood,
      MaterialId.glass,
      MaterialId.metal,
      MaterialId.ice,
      MaterialId.plant,
      MaterialId.vine,
      MaterialId.sponge,
      MaterialId.tnt,
    ],
  },
  {
    group: MaterialGroup.powders,
    label: 'Powders',
    materials: [
      MaterialId.sand,
      MaterialId.dirt,
      MaterialId.gravel,
      MaterialId.rubber,
      MaterialId.ash,
      MaterialId.snow,
      MaterialId.salt,
      MaterialId.seed,
      MaterialId.gunpowder,
      MaterialId.shard,
    ],
  },
  {
    group: MaterialGroup.liquids,
    label: 'Liquids',
    materials: [
      MaterialId.water,
      MaterialId.saltWater,
      MaterialId.oil,
      MaterialId.honey,
      MaterialId.mud,
      MaterialId.acid,
      MaterialId.lava,
      MaterialId.nitrogen,
    ],
  },
  {
    group: MaterialGroup.gases,
    label: 'Gases',
    materials: [
      MaterialId.steam,
      MaterialId.smoke,
      MaterialId.methane,
      MaterialId.chlorine,
      MaterialId.ember,
    ],
  },
  {
    group: MaterialGroup.energy,
    label: 'Energy',
    materials: [MaterialId.fire, MaterialId.spark, MaterialId.void, MaterialId.source],
  },
  {
    group: MaterialGroup.life,
    label: 'Life',
    materials: [
      MaterialId.algae,
      MaterialId.fish,
      MaterialId.bug,
      MaterialId.worm,
      MaterialId.bird,
      MaterialId.slime,
      MaterialId.ant,
      MaterialId.meat,
    ],
  },
]

/**
 * The tools, in the order they sit above the palette. Paint leads because it is what the page opens on;
 * the forces follow, and heat/chill come last as the pair that changes a cell without replacing it.
 */
export const TOOLS: readonly { tool: Tool; label: string; title: string }[] = [
  { tool: Tool.paint, label: 'Paint', title: 'Draw the selected material' },
  { tool: Tool.attract, label: 'Attract', title: 'Pull loose material toward you' },
  { tool: Tool.blast, label: 'Blast', title: 'Throw everything outward and heat it' },
  { tool: Tool.wind, label: 'Wind', title: 'Blow material whichever way you drag' },
  { tool: Tool.heat, label: 'Heat', title: 'Warm whatever is under the brush' },
  { tool: Tool.chill, label: 'Chill', title: 'Cool whatever is under the brush' },
]

/** Worlds you can drop in whole, so a food chain is one click away rather than a drawing exercise. */
export const PRESETS: readonly { preset: Preset; label: string; title: string }[] = [
  {
    preset: Preset.aquarium,
    label: 'Aquarium',
    title: 'A tank of water with algae and fish in it',
  },
  {
    preset: Preset.wild,
    label: 'Wild',
    title: 'Open country and a pond: grass, worms, bugs, birds and fish',
  },
  {
    preset: Preset.volcano,
    label: 'Volcano',
    title: 'An erupting mountain, with slimes in the caves at its feet',
  },
  {
    preset: Preset.antColony,
    label: 'Ant colony',
    title: 'Leafy wooden trunks with ants tunnelling galleries through them',
  },
]

/** The material a fresh page starts on. */
export const DEFAULT_MATERIAL: MaterialId = MaterialId.sand

export const simCopy = {
  tagline: 'Draw materials into a pixel world and watch them react.',
  taglineFun: 'Draw materials, mix them, and see what happens to the little world you just made.',
  hint: 'Pick a material and draw. Point at anything to see what it is.',
  /** Shown in place of the paint hint while a force tool is selected. */
  toolHints: {
    [Tool.attract]: 'Drag to pull loose material toward you.',
    [Tool.blast]: 'Click to throw everything outward. Hold it down for a fountain.',
    [Tool.wind]: 'Material blows whichever way you drag.',
    [Tool.heat]: 'Hold to warm things up. Ice melts, wood catches fire.',
    [Tool.chill]: 'Hold to cool things down. Water freezes, lava sets.',
  },
  /** A source that has not been fed yet has nothing to copy. */
  sourceEmpty: 'nothing yet',
  /** The collapsible tally of what the world currently holds. */
  census: {
    title: "What's in the world",
    empty: 'Nothing drawn yet.',
    /** On every row: the list re-sorts as counts change, so a marked row is one you can keep your eye on. */
    track: 'Mark this row to follow it as the list moves',
  },
  searchPlaceholder: 'Find a material',
  noMatch: 'Nothing by that name.',
  /** The slots under the palette, for the materials you keep coming back to. */
  slots: {
    /** Sits to the left of the row: without it the slots read as two odd extra swatches. */
    title: 'Favourites',
    empty: 'Empty',
    /** Shown on the slot that is waiting to be filled, in place of its material. */
    waiting: 'Pick one',
    setHint: 'Press to choose what this slot holds',
    useHint: 'Draw with this. Press it twice or Shift-press to change it',
  },
  settings: {
    open: 'Settings',
    title: 'Settings',
    close: 'Done',
  },
  /** The link that carries a world to somebody else, and what to say when it does or doesn't. */
  share: {
    button: 'Share',
    title: 'Copy a link to this world',
    copied: 'Link copied. Anyone who opens it gets this world.',
    /** Heat is the layer that gets dropped when a world will not fit; better a link than a refusal. */
    copiedWithoutHeat: 'Link copied. The heat would not fit, so this world arrives cold.',
    /** The clipboard is off limits in some browsers, so the address bar is the fallback that always works. */
    inBar: 'Copying was blocked, so the link is in the address bar instead.',
    tooBig:
      'This world is too detailed to fit in a link, even without its heat. Clear some of it and try again.',
    loaded: 'This world came from the link you opened.',
    refused: {
      malformed: 'That link is damaged, so nothing loaded.',
      version: 'That link came from a newer version of this page.',
      size: 'That link holds a world of a different size.',
      tooLong: 'That link is too long to be a world.',
      unsupported: 'This browser cannot open shared worlds.',
    },
  },
}

/** How long a note about a link stays up before the hint line goes back to normal, in ms. */
export const SHARE_NOTE_LINGER = 6000

/** The part of the URL a world travels in. Kept in the hash, so no world is ever sent to a server. */
export const SHARE_HASH_KEY = 'w'

/**
 * The picture settings, and what each one does in plain terms. Rendered straight from here, so the dialog
 * has no list of its own to fall out of step with.
 */
export const SETTING_ROWS: readonly { setting: SimSetting; label: string; hint: string }[] = [
  {
    setting: SimSetting.tintBlocks,
    label: 'Tint materials by temperature',
    hint: 'Warm cells glow orange, cold ones go blue. Turn it off to see materials in their own colours.',
  },
  {
    setting: SimSetting.tintAir,
    label: 'Tint air by temperature',
    hint: 'Shows warmth in the air itself, so you can watch heat rise off a fire. Gets busy once things burn.',
  },
]

/**
 * Materials are tinted by default and air is not: warmth in a solid is otherwise invisible until it crosses
 * a threshold, while hot air covers half the world in a haze that reads as fog rather than temperature.
 */
export const DEFAULT_SETTINGS: SimSettings = {
  [SimSetting.tintBlocks]: true,
  [SimSetting.tintAir]: false,
}

/** Where the settings live between visits. */
export const SETTINGS_KEY = 'pixel-world-settings'

/**
 * How many materials the quick slots hold. Three: enough for the handful you keep swapping between while
 * building something, and few enough that they stay a shortcut. A row of eight would just be the palette
 * again, and the palette is one tab away regardless.
 */
export const MATERIAL_SLOTS = 3
