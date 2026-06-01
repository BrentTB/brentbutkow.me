import Hero from './components/Hero'
import CurrentWork from './components/CurrentWork'
import About from './components/About'
import styles from './HomePage.module.scss'
import { heroContent, aboutSectionEnabled, aboutParagraphs } from './data'
import { useFunMode } from '../../contexts/useFunMode'
import { experience } from '../experience/data'
import { JokeTypes, jokeTypeLabels } from '../../data/jokes.types'
import { useJokes } from './useJokes'

const currentRole = experience.find((role) => role.period.toLowerCase().includes('present'))

const jokeCategories = Object.values(JokeTypes)

function HomePage() {
  const { isFunMode } = useFunMode()
  const { currentJoke, selectCategory } = useJokes()

  return (
    <main className={styles.main}>
      <section id="hero" className={styles.section}>
        <Hero content={heroContent} isFunMode={isFunMode} />
        {currentRole && <CurrentWork role={currentRole.role} company={currentRole.company} />}
      </section>
      {aboutSectionEnabled && <About paragraphs={aboutParagraphs} />}
      {isFunMode && (
        <section id="jokes" className={`${styles.section} ${styles.jokes}`}>
          <div className={styles.jokesHeader}>
            <h2 className={styles.jokesTitle}>A Joke Before You Go</h2>
            <div className={styles.jokesControls}>
              <button className={styles.categoryButton} onClick={() => selectCategory('all')}>
                All
              </button>
              {jokeCategories.map((type) => (
                <button
                  key={type}
                  className={styles.categoryButton}
                  onClick={() => selectCategory(type)}
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
