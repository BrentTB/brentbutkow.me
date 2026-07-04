// Pure route data: the path table. No component or page imports live here, so lazy page chunks can
// pull paths without dragging the eager route table — and every page-level import — into their bundle.

export const routePaths = {
  home: '/',
  experience: '/experience',
  education: '/education',
  achievements: '/achievements',
  projects: '/projects',
  recallRadar: '/projects/recall-radar',
  recallRadarConfirm: '/projects/recall-radar/confirm',
  recallRadarManage: '/projects/recall-radar/manage',
  recallRadarUnsubscribe: '/projects/recall-radar/unsubscribe',
  funStuff: '/fun-stuff',
  contact: '/contact',
  admin: '/admin',
  notFound: '*',
}
