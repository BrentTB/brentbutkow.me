import { PageLayout } from '../../../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../../../components/PageFormatting/PageHeader'
import { FunCard } from '../../components/FunCard'
import { games } from './data'
import styles from './GamesPage.module.scss'

export function GamesPage() {
  return (
    <PageLayout>
      <PageHeader title="Games" showBackButton />
      <div className={styles.container}>
        {games.map((game) => (
          <FunCard key={`${game.title}-${game.link ?? ''}`} item={game} />
        ))}
      </div>
    </PageLayout>
  )
}
