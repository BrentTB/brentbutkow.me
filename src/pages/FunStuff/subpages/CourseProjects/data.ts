interface CourseProject {
  title: string
  description: string
  link: string
}

export const courseProjects: CourseProject[] = [
  {
    title: '4th Year - Art Among Us',
    description:
      'A group project for Software Development III, where we created an online web game based on Gartic Phone, and inspired by Among Us. Players would get a prompt and have to draw it, and then other players would have to guess what the prompt was based on the drawing. However, the imposter tried to break the flow by guessing badly, while not exposing that they are the imposter. Players could then vote for the imposter to earn points',
    link: 'https://github.com/BrentTB/ArtAmongUs',
  },
  {
    title: '3rd Year - Defender SA',
    description:
      'A group project for Software Development II, where we created a game based on Defender, using c++ and SFML for gameplay and rendering. The game was a 2d shooter, where the user had to destroy enemies and save people to earn points. Multiple different enemies with different AIs were used for gameplay, and environmental factors (such as limited fuel and meteors that could damage the player) were added for additional functionality and difficulty',
    link: 'https://github.com/BrentTB/DefenderSA',
  },
  {
    title: 'Grd 11 - Chess PAT',
    description:
      'For my grade 11 PAT (Practical Assessment Task), I created a chess game in Java with an AI opponent that you could play against. The project included a GUI and a simple minimax algorithm for the AI',
    link: 'https://github.com/BrentTB/chess_PAT',
  },
  {
    title: 'Grd 11 - Space Math',
    description:
      'For a grade 11 project, I created a space-themed math game in Java. The user had to quickly solve math problems, or they would lose health. The user could unlock different skins, backgrounds, and effects, and there was a built in (local) leaderboard',
    link: 'https://github.com/BrentTB/space_math',
  },
]
