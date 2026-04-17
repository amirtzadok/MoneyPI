import { CATEGORY_COLORS } from '../utils/formatters'

interface Props {
  category: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ category, size = 'sm' }: Props) {
  const color = CATEGORY_COLORS[category] ?? '#374151'
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-block rounded-full font-medium ${padding}`}
      style={{ backgroundColor: color + '22', color }}
    >
      {category}
    </span>
  )
}
