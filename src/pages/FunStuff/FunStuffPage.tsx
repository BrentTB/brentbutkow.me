// import FunCard from './components/FunCard'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { CommandLine } from '../../components/PageFormatting/CommandLine'
import { FunCard } from './components/FunCard'
import { funStuff } from './data'
import styles from './FunStuffPage.module.scss'

export function FunStuffPage() {
  return (
    <PageLayout>
      <PageHeader title="Fun Stuff" />
      <CommandLine />
      <div className={styles.container}>
        {funStuff.map((item) => (
          <FunCard key={`${item.title}-${item.link ?? ''}`} item={item} />
        ))}
      </div>
    </PageLayout>
  )
}
