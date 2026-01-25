import { Experience } from '../../../data/data.types'
import DetailCard from '../../../components/DetailCard'

const PILLS_TO_SHOW = 6
function ExperienceCard({ role, company, period, description, skills }: Experience) {
  return (
    <DetailCard
      title={role}
      subtitle={company}
      period={period}
      descriptions={description ?? []}
      pills={skills}
      pillsLimit={PILLS_TO_SHOW}
    />
  )
}

export default ExperienceCard
