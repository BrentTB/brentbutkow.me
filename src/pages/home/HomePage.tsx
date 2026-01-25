import Hero from './components/Hero'
import ProjectsSection from './components/ProjectsSection'
import styles from './HomePage.module.scss'
import { heroContent, projects } from './data'

function HomePage() {
  return (
    <main className={styles.main}>
      <section id="hero" className={styles.section}>
        <Hero content={heroContent} />
      </section>
      <section id="projects" className={styles.section}>
        <ProjectsSection projects={projects} />
      </section>
    </main>
  )
}

export default HomePage
