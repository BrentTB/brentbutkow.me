import { useMemo, useState } from 'react'
import jokes from '../../data/jokes'
import { JokeTypes, jokeTypeLabels } from '../../data/jokes.types'
import Hero from './components/Hero'
import styles from './HomePage.module.scss'
import { heroContent } from './data'
import { useFunMode } from '../../contexts/FunMode'

const jokeCategories = Object.values(JokeTypes)

function HomePage() {
  const [selectedType, setSelectedType] = useState<JokeTypes | 'all'>('all')
  const { isFunMode } = useFunMode()

  const jokesForType = useMemo(
    () => (selectedType === 'all' ? jokes : jokes.filter((joke) => joke.jokeType === selectedType)),
    [selectedType, jokes]
  )

  const jokeOfTheMoment = useMemo(() => {
    if (!jokesForType.length) return null
    const randomIndex = Math.floor(Math.random() * jokesForType.length)
    return jokesForType[randomIndex]
  }, [jokesForType, isFunMode])

  return (
    <main className={styles.main}>
      <section id="hero" className={styles.section}>
        <Hero content={heroContent} isFunMode={isFunMode} />
      </section>
      {isFunMode && (
        <section id="jokes" className={styles.section}>
          <div className={styles.jokesHeader}>
            <h2 className={styles.jokesTitle}>A Joke Before You Go</h2>
            <div className={styles.jokesControls}>
              <label htmlFor="joke-category">Category</label>
              <select
                id="joke-category"
                className={styles.jokesSelect}
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value as JokeTypes | 'all')}
              >
                <option value="all">All categories</option>
                {jokeCategories.map((type) => (
                  <option key={type} value={type}>
                    {jokeTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.jokeCard}>
            <p className={styles.jokeText}>
              {jokeOfTheMoment?.joke ?? 'No jokes yet, but the punchline is loading...'}
            </p>
          </div>
        </section>
      )}
    </main>
  )
}

export default HomePage
