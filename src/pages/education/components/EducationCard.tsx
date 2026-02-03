import { Education } from '../../../data/data.types'
import DetailCard from '../../../components/cards/DetailCard'

const PILLS_TO_SHOW = 2

type EducationCardProps = Education & {
  id?: string
}

function EducationCard({
  id,
  degree,
  institution,
  period,
  description,
  achievements,
}: EducationCardProps) {
  return (
    <DetailCard
      id={id}
      title={degree}
      subtitle={institution}
      period={period}
      descriptions={description}
      pills={achievements}
      pillsLimit={PILLS_TO_SHOW}
    />
  )
}

export default EducationCard
