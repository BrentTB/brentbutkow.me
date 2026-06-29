// Pure route data: the path table and the back-button labels keyed off it. No component or page
// imports live here, so lazy page chunks (and BackButton) can pull paths/labels without dragging the
// eager route table — and every page-level import — into their bundle.

export const routePaths = {
  home: '/',
  experience: '/experience',
  education: '/education',
  achievements: '/achievements',
  projects: '/projects',
  recallRadar: '/projects/recall-radar',
  recallRadarConfirm: '/projects/recall-radar/confirm',
  recallRadarManage: '/projects/recall-radar/manage',
  funStuff: '/fun-stuff',
  contact: '/contact',
  notFound: '*',
}

// Short, human names for the routes a back button lands on. The structural BackButton looks up its
// destination here to read "← Recall Radar" instead of a generic "← Back"; unlisted targets stay "Back".
export const routeLabels: Record<string, string> = {
  [routePaths.home]: 'Home',
  [routePaths.projects]: 'Projects',
  [routePaths.recallRadar]: 'Recall Radar',
  [routePaths.funStuff]: 'Fun Stuff',
  [`${routePaths.funStuff}/games`]: 'Games',
}
