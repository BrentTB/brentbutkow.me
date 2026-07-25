import { FunItem } from '../../../../data/data.types'

export const gamesSubRoutes = {
  nullSpace: '/null-space',
  pixelWorldSimulator: '/pixel-world-simulator',
}

export const games: FunItem[] = [
  {
    title: 'Null Space',
    description:
      'A space defense game where you control the fabric of space itself: launch meteors, create black holes, and warp reality to protect your ship',
    link: gamesSubRoutes.nullSpace,
  },
  {
    title: 'Pixel World Simulator',
    description:
      'A pixel sandbox: draw materials, pile them on top of each other, and watch how they react',
    link: gamesSubRoutes.pixelWorldSimulator,
  },
]
