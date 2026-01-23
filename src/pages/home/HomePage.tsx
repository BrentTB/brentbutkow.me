import Hero from './components/Hero'
import Navbar from './components/Navbar'
import ContactSection from './components/ContactSection'
import ExperienceSection from './components/ExperienceSection'
import ProjectsSection from './components/ProjectsSection'
import styles from './HomePage.module.css'
import { contactInfo, experience, heroContent, projects } from '../../data/data'

function HomePage() {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main}>
        <section id="hero" className={styles.section}>
          <Hero content={heroContent} />
        </section>
        <section id="projects" className={styles.section}>
          <ProjectsSection projects={projects} />
        </section>
        <section id="experience" className={styles.section}>
          <ExperienceSection entries={experience} />
        </section>
        <section id="contact" className={styles.section}>
          <ContactSection info={contactInfo} />
        </section>
      </main>
    </div>
  )
}

export default HomePage
