import { useCallback, useMemo, useState } from 'react'
import jokes from '../../data/jokes'
import { JokeTypes, jokeTypeLabels } from '../../data/jokes.types'
import Hero from './components/Hero'
import CurrentWork from './components/CurrentWork'
import About from './components/About'
import styles from './HomePage.module.scss'
import { heroContent, aboutSectionEnabled, aboutParagraphs } from './data'
import { useFunMode } from '../../contexts/useFunMode'
import { experience } from '../experience/data'

const currentRole = experience.find((role) => role.period.toLowerCase().includes('present'))

const jokeCategories = Object.values(JokeTypes)
const ALL_CATEGORY = 'all'
type JokeCategory = JokeTypes | typeof ALL_CATEGORY

const getFilteredJokes = () => {
  const initialFilteredJokes: Record<string, typeof jokes> = {}
  jokeCategories.forEach((type) => {
    initialFilteredJokes[type] = jokes.filter((joke) => joke.jokeType === type)
  })
  initialFilteredJokes[ALL_CATEGORY] = jokes
  return initialFilteredJokes
}

const getJoke = (category: JokeCategory, filteredJokes: Record<string, typeof jokes>) => {
  const jokesInCategory = filteredJokes[category]
  if (jokesInCategory && jokesInCategory.length > 0) {
    const randomIndex = Math.floor(Math.random() * jokesInCategory.length)
    return jokesInCategory[randomIndex]
  }
  return null
}

function HomePage() {
  const { isFunMode } = useFunMode()
  const filteredJokes = useMemo(() => getFilteredJokes(), [])
  const [currentJoke, setCurrentJoke] = useState(getJoke(ALL_CATEGORY, filteredJokes))

  const handleCategoryClick = useCallback(
    (category: JokeCategory) => {
      const newJoke = getJoke(category, filteredJokes)
      setCurrentJoke(newJoke)
    },
    [filteredJokes]
  )

  return (
    <main className={styles.main}>
      <section id="hero" className={styles.section}>
        <Hero content={heroContent} isFunMode={isFunMode} />
        {currentRole && <CurrentWork role={currentRole.role} company={currentRole.company} />}
      </section>
      {aboutSectionEnabled && <About paragraphs={aboutParagraphs} />}
      {isFunMode && (
        <section id="jokes" className={styles.section}>
          <div className={styles.jokesHeader}>
            <h2 className={styles.jokesTitle}>A Joke Before You Go</h2>
            <div className={styles.jokesControls}>
              <button className={styles.categoryButton} onClick={() => handleCategoryClick('all')}>
                All
              </button>
              {jokeCategories.map((type) => (
                <button
                  key={type}
                  className={styles.categoryButton}
                  onClick={() => handleCategoryClick(type)}
                >
                  {jokeTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.jokeCard}>
            <p className={styles.jokeText}>
              {currentJoke?.joke ?? 'No jokes yet, but the punchline is loading...'}
            </p>
          </div>
        </section>
      )}
    </main>
  )
}

export default HomePage
