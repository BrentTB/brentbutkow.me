import PageLayout from '../../../../components/PageFormatting/PageLayout'
import PageHeader from '../../../../components/PageFormatting/PageHeader'
import FunCard from '../../components/FunCard'
import { games } from './data'
import styles from './GamesPage.module.scss'

function GamesPage() {
  return (
    <PageLayout>
      <PageHeader title="Games" />
      <div className={styles.container}>
        {games.map((game) => (
          <FunCard key={`${game.title}-${game.link ?? ''}`} item={game} />
        ))}
      </div>
    </PageLayout>
  )
}

export default GamesPage
