import { Education } from '../../../data/data.types'
import DetailCard from '../../../components/cards/DetailCard'

const PILLS_TO_SHOW = 2
function EducationCard({ degree, institution, period, description, achievements }: Education) {
  return (
    <DetailCard
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
