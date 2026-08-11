import { FunItem } from '../../../../data/data.types'

export const gamesSubRoutes = {
  nullSpace: '/null-space',
  pixelWorldSimulator: '/pixel-world-simulator',
  ticTacToe: '/4x4x4-tic-tac-toe',
  othello: '/othello',
}

export const games: FunItem[] = [
  {
    title: 'Null Space',
    label: 'Arcade',
    description:
      'A space defense game where you control the fabric of space itself: launch meteors, create black holes, and warp reality to protect your ship',
    link: gamesSubRoutes.nullSpace,
  },
  {
    title: 'Pixel World Simulator',
    label: 'Sandbox',
    description:
      'A pixel sandbox: draw materials, pile them on top of each other, and watch how they react',
    link: gamesSubRoutes.pixelWorldSimulator,
  },
  {
    title: '4×4×4 Tic-Tac-Toe',
    label: 'Board',
    description:
      'A game my dad taught me, also known as Qubic: four in a row on a 4×4 board, except the board is a cube four layers deep. Play a friend in person or online, or take on the computer',
    link: gamesSubRoutes.ticTacToe,
  },
  {
    title: 'Othello',
    label: 'Board',
    description:
      'Trap a row of your opponent’s discs and they all flip to your colour. One move can swing the whole board. Play a friend in person or online, or take on the computer, and size it down to a quick 6×6 or up to a longer 10×10',
    link: gamesSubRoutes.othello,
  },
]
