// ASCII art for the terminal's visual eggs — the `sl` steam locomotive and `cowsay`.

// A CSS transform slides the locomotive across the log; the hook clears it after this long, so
// keep the two in step (the value is passed to the animation as its duration, so they can't drift).
export const TRAIN_DURATION_MS = 4000

export const STEAM_LOCOMOTIVE = [
  '      ====        ________                ___________',
  '  _D _|  |_______/        \\__I_I_____===__|_________|',
  '   |(_)---  |   H\\________/ |   |        =|___ ___|',
  '   /     |  |   H  |  |     |   |         ||_| |_||',
  '  |      |  |   H  |__--------------------| [___] |',
  '  | ________|___H__/__|_____/[][]~\\_______|       |',
  '  |/ |   |-----------I_____I [][] []  D   |=======|__',
].join('\n')

const COW = [
  '        \\   ^__^',
  '         \\  (oo)\\_______',
  '            (__)\\       )\\/\\',
  '                ||----w |',
  '                ||     ||',
]

const COWSAY_MAX_LENGTH = 40

export function cowsay(message: string): string {
  const text = (message.trim() || 'moo').slice(0, COWSAY_MAX_LENGTH)
  const bubble = [` ${'_'.repeat(text.length + 2)}`, `< ${text} >`, ` ${'-'.repeat(text.length + 2)}`]
  return [...bubble, ...COW].join('\n')
}
