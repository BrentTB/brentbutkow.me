import { Education } from '../../../data/data.types'
import { DetailCard } from '../../../components/cards/DetailCard'

const PILLS_TO_SHOW = 2
export function EducationCard({
  degree,
  institution,
  link,
  period,
  description,
  achievements,
}: Education) {
  return (
    <DetailCard
      title={degree}
      subtitle={institution}
      subtitleLink={link}
      period={period}
      descriptions={description}
      pills={achievements}
      pillsLimit={PILLS_TO_SHOW}
    />
  )
}
