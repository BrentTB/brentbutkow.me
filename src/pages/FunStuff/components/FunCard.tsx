import { useLocation } from 'react-router-dom'
import { FunItem } from '../../../data/data.types'
import { LabelledRow } from '../../../components/cards/LabelledRow'

type FunCardProps = {
  item: FunItem
}

/** A Fun Stuff row. Its links are written relative to the list they sit in, so the path prefixes them. */
export function FunCard({ item }: FunCardProps) {
  const location = useLocation()

  const external = item.link ? /^https?:\/\//.test(item.link) : false
  const prefix = external ? '' : location.pathname

  return (
    <LabelledRow
      label={item.label}
      title={item.title}
      description={item.description}
      href={item.link ? `${prefix}${item.link}` : undefined}
      internal={!external}
      hub={item.hub}
    />
  )
}
